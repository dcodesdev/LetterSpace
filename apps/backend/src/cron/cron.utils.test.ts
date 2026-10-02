import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cronJob } from "./cron.utils"

const deferred = () => {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

describe("cronJob", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should run the wrapped function", async () => {
    const fn = vi.fn().mockResolvedValue(undefined)

    await cronJob("runs", fn)()

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("should skip a run while a previous one is still in flight", async () => {
    const gate = deferred()
    const fn = vi.fn().mockReturnValue(gate.promise)
    const job = cronJob("concurrent", fn)

    const first = job()
    await job()

    expect(fn).toHaveBeenCalledTimes(1)

    gate.resolve()
    await first
  })

  it("should release the lock after a successful run", async () => {
    const fn = vi.fn().mockResolvedValue(undefined)
    const job = cronJob("release-success", fn)

    await job()
    await job()

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it("should release the lock after a throw", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"))
    const job = cronJob("release-throw", fn)

    await job()
    await job()

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it("should swallow errors and log them", async () => {
    const error = new Error("boom")
    const job = cronJob("swallow", vi.fn().mockRejectedValue(error))

    await expect(job()).resolves.toBeUndefined()
    expect(console.error).toHaveBeenCalledWith(
      "Cron Error:",
      "[swallow]",
      error
    )
  })

  it("should swallow a synchronous throw", async () => {
    const job = cronJob("sync-throw", () => {
      throw new Error("sync boom")
    })

    await expect(job()).resolves.toBeUndefined()
  })

  it("should lock per name, not globally", async () => {
    const gate = deferred()
    const blocking = cronJob("name-a", () => gate.promise)
    const other = vi.fn().mockResolvedValue(undefined)

    const first = blocking()
    await cronJob("name-b", other)()

    expect(other).toHaveBeenCalledTimes(1)

    gate.resolve()
    await first
  })
})
