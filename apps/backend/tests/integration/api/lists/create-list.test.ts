import { describe, expect, it } from "vitest"
import { createUser } from "@helpers/user/user"
import { request } from "@helpers/request"

describe("Create List", () => {
  it("should create a list", async () => {
    const { apiKey } = await createUser()

    const response = await request
      .post("/api/lists")
      .set("x-api-key", apiKey.key)
      .send({ name: "Test List" })

    // TODO: Add tests
    // expect(response.status).toBe(201)
    // expect(response.body).toBeDefined()
    // expect(response.body.name).toBe("Test List")
  })
})
