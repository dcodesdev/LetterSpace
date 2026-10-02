import { describe, expect, it } from "vitest"
import { resolveProps } from "./pProps"

describe("resolveProps", () => {
  it("should resolve every key", async () => {
    const result = await resolveProps({
      count: Promise.resolve(2),
      name: Promise.resolve("list"),
    })

    expect(result).toEqual({ count: 2, name: "list" })
  })

  it("should preserve types", async () => {
    const result = await resolveProps({
      count: Promise.resolve(2),
      rows: Promise.resolve([{ id: "1" }]),
    })

    expect(result.count + 1).toBe(3)
    expect(result.rows[0]?.id).toBe("1")
  })

  it("should resolve to an empty object for no keys", async () => {
    await expect(resolveProps({})).resolves.toEqual({})
  })

  it("should run the promises concurrently", async () => {
    const started: string[] = []
    const later = async (key: string) => {
      started.push(key)
      await new Promise((resolve) => setTimeout(resolve, 20))
      return key
    }

    const start = Date.now()
    await resolveProps({ a: later("a"), b: later("b") })

    expect(started).toEqual(["a", "b"])
    expect(Date.now() - start).toBeLessThan(60)
  })

  it("should propagate a rejection", async () => {
    await expect(
      resolveProps({
        ok: Promise.resolve(1),
        bad: Promise.reject(new Error("boom")),
      })
    ).rejects.toThrow("boom")
  })
})
