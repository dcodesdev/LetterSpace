import { createApiKey, createUser } from "@helpers/factories"
import { request } from "@helpers/request"
import { waitFor } from "@helpers/wait-for"
import { prisma } from "@src/utils/prisma"
import { describe, expect, it } from "vitest"

describe("authenticateApiKey", () => {
  it("rejects a request without an API key", async () => {
    const response = await request.get("/api/subscribers")

    expect(response.status).toBe(401)
    expect(response.body.error).toBe("Missing API Key")
  })

  it("rejects a request with an empty API key header", async () => {
    const response = await request.get("/api/subscribers").set("x-api-key", "")

    expect(response.status).toBe(401)
    expect(response.body.error).toBe("Missing API Key")
  })

  it("rejects a request with an unknown API key", async () => {
    const response = await request
      .get("/api/subscribers")
      .set("x-api-key", "not-a-real-key")

    expect(response.status).toBe(401)
    expect(response.body.error).toBe("Invalid API Key")
  })

  it("scopes the request to the organization owning the key", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()
    const { orgId: otherOrgId } = await createUser()

    await prisma.subscriber.create({
      data: { email: "mine@test.com", organizationId: orgId },
    })
    await prisma.subscriber.create({
      data: { email: "theirs@test.com", organizationId: otherOrgId },
    })

    const response = await request
      .get("/api/subscribers")
      .set("x-api-key", apiKey)

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(1)
    expect(response.body.data[0].email).toBe("mine@test.com")
  })

  it("updates lastUsed on a successful authentication", async () => {
    const { orgId } = await createUser()
    const apiKey = await createApiKey({ organizationId: orgId })

    expect(apiKey.lastUsed).toBeNull()

    const response = await request
      .get("/api/subscribers")
      .set("x-api-key", apiKey.key)

    expect(response.status).toBe(200)

    // lastUsed is written fire-and-forget, after the response is sent.
    await waitFor(async () => {
      const updated = await prisma.apiKey.findUniqueOrThrow({
        where: { id: apiKey.id },
      })
      expect(updated.lastUsed).not.toBeNull()
    })
  })

  it("does not update lastUsed for a rejected key", async () => {
    const { orgId } = await createUser()
    const apiKey = await createApiKey({ organizationId: orgId })

    await request.get("/api/subscribers").set("x-api-key", "wrong-key")

    const unchanged = await prisma.apiKey.findUniqueOrThrow({
      where: { id: apiKey.id },
    })
    expect(unchanged.lastUsed).toBeNull()
  })

  it("applies to every /api route", async () => {
    const responses = [
      await request.post("/api/subscribers").send({}),
      await request.put("/api/subscribers/some-id").send({}),
      await request.delete("/api/subscribers/some-id"),
      await request.get("/api/subscribers/some-id"),
    ]

    for (const response of responses) {
      expect(response.status).toBe(401)
    }
  })
})
