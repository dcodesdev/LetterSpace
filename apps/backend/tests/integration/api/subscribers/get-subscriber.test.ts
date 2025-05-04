import { describe, it, expect } from "vitest"
import { createUser } from "@helpers/user/user"
import { request } from "@helpers/request"
import { createList } from "@tests/integration/helpers/list/list"
import { prisma } from "@src/utils/prisma"

describe("[GET] /api/subscribers/:id", () => {
  it("should get a subscriber by id", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()

    const subscriber = await prisma.subscriber.create({
      data: {
        email: "test@test.com",
        name: "Test User",
        organizationId: orgId,
      },
    })

    const response = await request
      .get(`/api/subscribers/${subscriber.id}`)
      .set("x-api-key", apiKey)

    expect(response.status).toBe(200)
    expect(response.body.id).toBe(subscriber.id)
    expect(response.body.email).toBe("test@test.com")
    expect(response.body.name).toBe("Test User")
  })

  it("should get subscriber with lists", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()

    const list = await createList({
      name: "Test List",
      description: "Test Description",
      organizationId: orgId,
    })

    const subscriber = await prisma.subscriber.create({
      data: {
        email: "test@test.com",
        organizationId: orgId,
        ListSubscribers: {
          create: {
            List: { connect: { id: list.id } },
          },
        },
      },
    })

    const response = await request
      .get(`/api/subscribers/${subscriber.id}`)
      .set("x-api-key", apiKey)

    expect(response.status).toBe(200)
    expect(response.body.lists).toHaveLength(1)
    expect(response.body.lists[0]).toEqual({
      id: list.id,
      name: "Test List",
      description: "Test Description",
    })
  })

  it("should return 404 for non-existent subscriber", async () => {
    const {
      apiKey: { key: apiKey },
    } = await createUser()

    const response = await request
      .get(`/api/subscribers/non-existent-id`)
      .set("x-api-key", apiKey)

    expect(response.status).toBe(404)
    expect(response.body.error).toBe("Subscriber not found")
  })

  it("should return 404 when trying to get subscriber from another organization", async () => {
    const {
      apiKey: { key: apiKey },
    } = await createUser()
    const { orgId: otherOrgId } = await createUser()

    const subscriber = await prisma.subscriber.create({
      data: {
        email: "test@test.com",
        organizationId: otherOrgId,
      },
    })

    const response = await request
      .get(`/api/subscribers/${subscriber.id}`)
      .set("x-api-key", apiKey)

    expect(response.status).toBe(404)
  })
})
