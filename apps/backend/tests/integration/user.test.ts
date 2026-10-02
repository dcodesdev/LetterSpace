import { request } from "@helpers/request"
import swaggerSpec from "@src/swagger"
import { describe, expect, it } from "vitest"

describe("App smoke test", () => {
  it("serves the swagger docs", async () => {
    const response = await request.get("/docs/")
    expect(response.status).toBe(200)
    expect(response.headers["content-type"]).toContain("text/html")
  })

  it("serves the swagger spec with the documented subscriber routes", async () => {
    const response = await request.get("/docs/swagger-ui-init.js")

    expect(response.status).toBe(200)
    expect(response.text).toContain("/subscribers")
  })

  it("builds a spec covering every documented API route", () => {
    const spec = swaggerSpec as {
      openapi: string
      paths: Record<string, Record<string, unknown>>
    }

    expect(spec.openapi).toBe("3.0.0")
    expect(Object.keys(spec.paths["/api/subscribers"] ?? {})).toEqual(
      expect.arrayContaining(["get", "post"])
    )
    expect(Object.keys(spec.paths["/api/subscribers/{id}"] ?? {})).toEqual(
      expect.arrayContaining(["get", "put", "delete"])
    )
  })
})
