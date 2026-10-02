import { fakeRequest } from "@helpers/fake-request"
import { runAuthorization } from "@src/webhook/authorization"
import { describe, expect, it } from "vitest"

const WEBHOOK_ID = "wh_test"

const authorize = (authCode: string | null, req = fakeRequest()) =>
  runAuthorization({ authCode }, req, WEBHOOK_ID)

describe("runAuthorization", () => {
  it("accepts when the code returns true", async () => {
    const result = await authorize(`function authorize() { return true }`)

    expect(result).toEqual({ success: true })
  })

  it("rejects with 401 when the code returns false", async () => {
    const result = await authorize(`function authorize() { return false }`)

    expect(result).toEqual({
      success: false,
      status: 401,
      error: "Unauthorized",
    })
  })

  it("rejects with 401 when the code returns a falsy non-boolean", async () => {
    const result = await authorize(`function authorize() { return 0 }`)

    expect(result).toMatchObject({ success: false, status: 401 })
  })

  it("returns 500 on a syntax error", async () => {
    const result = await authorize("function authorize( {")

    expect(result).toEqual({
      success: false,
      status: 500,
      error: "Authorization code error",
    })
  })

  it("returns 500 when the code throws", async () => {
    const result = await authorize(
      `function authorize() { throw new Error('boom') }`
    )

    expect(result).toMatchObject({ success: false, status: 500 })
  })

  it("returns 500 when authorize is not defined", async () => {
    const result = await authorize(`const notAuthorize = () => true`)

    expect(result).toMatchObject({ success: false, status: 500 })
  })
})

describe("bearer token scheme", () => {
  const bearerCode = `
    function authorize(headers) {
      return headers.authorization === 'Bearer secret-token'
    }
  `

  it("accepts a valid token", async () => {
    const result = await authorize(
      bearerCode,
      fakeRequest({ headers: { authorization: "Bearer secret-token" } })
    )

    expect(result).toEqual({ success: true })
  })

  it("rejects a wrong token", async () => {
    const result = await authorize(
      bearerCode,
      fakeRequest({ headers: { authorization: "Bearer nope" } })
    )

    expect(result).toMatchObject({ success: false, status: 401 })
  })

  it("rejects a missing header", async () => {
    const result = await authorize(bearerCode, fakeRequest())

    expect(result).toMatchObject({ success: false, status: 401 })
  })
})

describe("shared secret in the body", () => {
  const bodyCode = `
    function authorize(headers, body) {
      return body.secret === 'sh4red'
    }
  `

  it("accepts a valid secret", async () => {
    const result = await authorize(
      bodyCode,
      fakeRequest({ body: { secret: "sh4red" } })
    )

    expect(result).toEqual({ success: true })
  })

  it("rejects a wrong secret", async () => {
    const result = await authorize(
      bodyCode,
      fakeRequest({ body: { secret: "guess" } })
    )

    expect(result).toMatchObject({ success: false, status: 401 })
  })
})

describe("api key in the query string", () => {
  const queryCode = `
    function authorize(headers, body, query) {
      return query.key === 'abc123'
    }
  `

  it("accepts a valid key", async () => {
    const result = await authorize(
      queryCode,
      fakeRequest({ query: { key: "abc123" } })
    )

    expect(result).toEqual({ success: true })
  })

  it("rejects a missing key", async () => {
    const result = await authorize(queryCode, fakeRequest())

    expect(result).toMatchObject({ success: false, status: 401 })
  })
})

describe("route params", () => {
  it("receives params", async () => {
    const result = await authorize(
      `function authorize(headers, body, query, params) {
        return params.webhookId === 'wh_test'
      }`,
      fakeRequest({ params: { webhookId: "wh_test" } })
    )

    expect(result).toEqual({ success: true })
  })
})

describe("sandboxing", () => {
  it("has no access to host globals", async () => {
    const result = await authorize(
      `function authorize() {
        return typeof process === 'undefined' &&
          typeof require === 'undefined' &&
          typeof globalThis.fetch === 'undefined'
      }`
    )

    expect(result).toEqual({ success: true })
  })
})
