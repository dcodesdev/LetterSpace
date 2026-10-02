import { fakeRequest } from "@helpers/fake-request"
import { transformPayload } from "@src/webhook/transformer"
import { describe, expect, it } from "vitest"

const WEBHOOK_ID = "wh_test"

const transform = (transformCode: string | null, req = fakeRequest()) =>
  transformPayload({ transformCode }, req, WEBHOOK_ID)

describe("transformPayload without transform code", () => {
  it("accepts a valid payload", async () => {
    const result = await transform(
      null,
      fakeRequest({ body: { messageId: "abc", event: "delivered" } })
    )

    expect(result).toEqual({
      success: true,
      data: { messageId: "abc", event: "delivered" },
    })
  })

  it("keeps an error field", async () => {
    const result = await transform(
      null,
      fakeRequest({
        body: { messageId: "abc", event: "bounced", error: "hard bounce" },
      })
    )

    expect(result).toMatchObject({
      success: true,
      data: { error: "hard bounce" },
    })
  })

  it("rejects a payload missing messageId with 400", async () => {
    const result = await transform(
      null,
      fakeRequest({ body: { event: "sent" } })
    )

    expect(result).toMatchObject({ success: false, status: 400 })
    expect(result).toHaveProperty("error", expect.stringContaining("messageId"))
  })
})

describe("transformPayload with transform code", () => {
  it("maps a custom payload shape", async () => {
    const result = await transform(
      `function transform(payload) {
        return { messageId: payload.id, event: payload.type }
      }`,
      fakeRequest({ body: { id: "msg-1", type: "opened" } })
    )

    expect(result).toEqual({
      success: true,
      data: { messageId: "msg-1", event: "opened" },
    })
  })

  it("receives headers and query", async () => {
    const result = await transform(
      `function transform(payload, headers, query) {
        return { messageId: headers['x-message-id'], event: query.event }
      }`,
      fakeRequest({
        headers: { "x-message-id": "from-header" },
        query: { event: "clicked" },
      })
    )

    expect(result).toEqual({
      success: true,
      data: { messageId: "from-header", event: "clicked" },
    })
  })

  it("escapes quotes, backslashes and newlines in string values", async () => {
    const error = 'said "no" at C:\\tmp\nline two\ttab'
    const result = await transform(
      `function transform(payload) {
        return { messageId: payload.id, event: 'bounced', error: payload.reason }
      }`,
      fakeRequest({ body: { id: 'msg-"1"', reason: error } })
    )

    expect(result).toEqual({
      success: true,
      data: { messageId: 'msg-"1"', event: "bounced", error },
    })
  })

  it("escapes quotes, backslashes and newlines in keys", async () => {
    const key = 'a"b\\c\nd'
    const result = await transform(
      `function transform(payload) {
        const obj = {}
        obj[payload.key] = 1
        return { messageId: JSON.stringify(obj), event: 'sent' }
      }`,
      fakeRequest({ body: { key } })
    )

    expect(result).toEqual({
      success: true,
      data: { messageId: JSON.stringify({ [key]: 1 }), event: "sent" },
    })
  })

  it("returns 500 on a syntax error", async () => {
    const result = await transform("function transform( {")

    expect(result).toMatchObject({ success: false, status: 500 })
    expect(result).toHaveProperty(
      "error",
      expect.stringContaining("Transform code error")
    )
  })

  it("returns 500 when the transform throws", async () => {
    const result = await transform(
      `function transform() { throw new Error('boom') }`
    )

    expect(result).toMatchObject({ success: false, status: 500 })
    expect(result).toHaveProperty("error", expect.stringContaining("boom"))
  })

  it("returns 500 when the transform result fails validation", async () => {
    const result = await transform(
      `function transform() { return { event: 'sent' } }`
    )

    expect(result).toMatchObject({ success: false, status: 500 })
    expect(result).toHaveProperty(
      "error",
      expect.stringContaining("Transform validation error")
    )
  })

  // The wrapper copies the transform result with `for (const key in result)`,
  // so an undefined return becomes `{}` and never reaches the raw-body fallback
  it("fails validation when the transform returns undefined", async () => {
    const result = await transform(
      `function transform() { return undefined }`,
      fakeRequest({ body: { messageId: "raw-1", event: "sent" } })
    )

    expect(result).toMatchObject({ success: false, status: 500 })
    expect(result).toHaveProperty(
      "error",
      expect.stringContaining("Transform validation error")
    )
  })

  it("times out an infinite loop", { timeout: 30_000 }, async () => {
    const result = await transform(`function transform() { while (true) {} }`)

    expect(result).toMatchObject({ success: false, status: 500 })
    expect(result).toHaveProperty("error", expect.stringContaining("timed out"))
  })

  it("enforces the memory limit", { timeout: 30_000 }, async () => {
    const result = await transform(
      `function transform() {
        let s = 'x'
        while (true) { s = s + s }
      }`
    )

    expect(result).toMatchObject({ success: false, status: 500 })
  })

  it("has no access to host globals", async () => {
    const result = await transform(
      `function transform() {
        return {
          messageId: [
            typeof process,
            typeof require,
            typeof globalThis.fetch,
            typeof setTimeout,
          ].join(','),
          event: 'sent',
        }
      }`
    )

    expect(result).toEqual({
      success: true,
      data: {
        messageId: "undefined,undefined,undefined,undefined",
        event: "sent",
      },
    })
  })
})
