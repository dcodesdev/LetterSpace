import { describe, it, expect } from "vitest"
import { request } from "./helpers/request"

describe("First test", () => {
  it("Should return hello world", async () => {
    const response = await request.get("/")
    expect(response.status).toBe(200)
  })
})
