import { request } from "@helpers/request"
import { createUser } from "@helpers/user/user"
import { prisma } from "@src/utils/prisma"
import { createList } from "@tests/integration/helpers/list/list"
import { describe, expect, it } from "vitest"

describe("[DELETE] /api/subscribers/:id", () => {
  it("should delete a subscriber", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()

    const subscriber = await prisma.subscriber.create({
      data: {
        email: "test@test.com",
        organizationId: orgId,
      },
    })

    const response = await request
      .delete(`/api/subscribers/${subscriber.id}`)
      .set("x-api-key", apiKey)

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)

    const deletedSubscriber = await prisma.subscriber.findUnique({
      where: { id: subscriber.id },
    })
    expect(deletedSubscriber).toBeNull()
  })

  it("should delete subscriber and associated list subscriptions", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()

    const list = await createList({
      name: "Test List",
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
      .delete(`/api/subscribers/${subscriber.id}`)
      .set("x-api-key", apiKey)

    expect(response.status).toBe(200)

    const listSubscriptions = await prisma.listSubscriber.findMany({
      where: { subscriberId: subscriber.id },
    })
    expect(listSubscriptions).toHaveLength(0)
  })

  it("should return 404 for non-existent subscriber", async () => {
    const {
      apiKey: { key: apiKey },
    } = await createUser()

    const response = await request
      .delete(`/api/subscribers/non-existent-id`)
      .set("x-api-key", apiKey)

    expect(response.status).toBe(404)
    expect(response.body.error).toBe("Subscriber not found")
  })

  it("should return 404 when trying to delete subscriber from another organization", async () => {
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
      .delete(`/api/subscribers/${subscriber.id}`)
      .set("x-api-key", apiKey)

    expect(response.status).toBe(404)
  })
})
