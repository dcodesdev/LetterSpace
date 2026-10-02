import { createList, createUser } from "@helpers/factories"
import { request } from "@helpers/request"
import { prisma } from "@src/utils/prisma"
import { describe, expect, it } from "vitest"

describe("[PUT] /api/subscribers/:id", () => {
  it("should update subscriber details", async () => {
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
            List: {
              connect: {
                id: list.id,
              },
            },
          },
        },
      },
    })

    const response = await request
      .put(`/api/subscribers/${subscriber.id}`)
      .set("x-api-key", apiKey)
      .send({
        email: "updated@test.com",
        name: "Updated Name",
      })

    expect(response.status).toBe(200)
    expect(response.body.email).toBe("updated@test.com")
    expect(response.body.name).toBe("Updated Name")
  })

  it("should update subscriber lists", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()

    const list1 = await createList({
      name: "List 1",
      organizationId: orgId,
    })

    const list2 = await createList({
      name: "List 2",
      organizationId: orgId,
    })

    const subscriber = await prisma.subscriber.create({
      data: {
        email: "test@test.com",
        organizationId: orgId,
        ListSubscribers: {
          create: {
            List: {
              connect: {
                id: list1.id,
              },
            },
          },
        },
      },
    })

    const response = await request
      .put(`/api/subscribers/${subscriber.id}`)
      .set("x-api-key", apiKey)
      .send({
        email: "test@test.com",
        lists: [list2.id],
      })

    expect(response.status).toBe(200)
    expect(response.body.lists).toHaveLength(1)
    expect(response.body.lists[0].id).toBe(list2.id)
  })

  it("should return 404 for non-existent subscriber", async () => {
    const {
      apiKey: { key: apiKey },
    } = await createUser()

    const response = await request
      .put(`/api/subscribers/non-existent-id`)
      .set("x-api-key", apiKey)
      .send({
        email: "test@test.com",
      })

    expect(response.status).toBe(404)
  })

  it("should keep existing lists when lists not provided in update", async () => {
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
      include: {
        ListSubscribers: { include: { List: true } },
      },
    })

    const response = await request
      .put(`/api/subscribers/${subscriber.id}`)
      .set("x-api-key", apiKey)
      .send({
        name: "Updated Name",
      })

    expect(response.status).toBe(200)
    expect(response.body.email).toBe("test@test.com")
    expect(response.body.name).toBe("Updated Name")
    expect(response.body.lists).toHaveLength(1)
    expect(response.body.lists[0].id).toBe(list.id)
  })

  it("should keep existing name when name not provided in update", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()

    const subscriber = await prisma.subscriber.create({
      data: {
        email: "test@test.com",
        name: "Original Name",
        organizationId: orgId,
      },
    })

    const response = await request
      .put(`/api/subscribers/${subscriber.id}`)
      .set("x-api-key", apiKey)
      .send({
        email: "updated@test.com",
      })

    expect(response.status).toBe(200)
    expect(response.body.email).toBe("updated@test.com")
    expect(response.body.name).toBe("Original Name")
  })

  it("should keep existing email when email not provided in update", async () => {
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
      .put(`/api/subscribers/${subscriber.id}`)
      .set("x-api-key", apiKey)
      .send({
        name: "New Name",
      })

    expect(response.status).toBe(200)
    expect(response.body.email).toBe("test@test.com")
    expect(response.body.name).toBe("New Name")
  })
  it("should reject an invalid email format", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()

    const subscriber = await prisma.subscriber.create({
      data: { email: "test@test.com", organizationId: orgId },
    })

    const response = await request
      .put(`/api/subscribers/${subscriber.id}`)
      .set("x-api-key", apiKey)
      .send({ email: "not-an-email" })

    expect(response.status).toBe(400)
    expect(response.body.error).toBeDefined()

    const unchanged = await prisma.subscriber.findUniqueOrThrow({
      where: { id: subscriber.id },
    })
    expect(unchanged.email).toBe("test@test.com")
  })

  it("should reject an empty lists array", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()

    const subscriber = await prisma.subscriber.create({
      data: { email: "test@test.com", organizationId: orgId },
    })

    const response = await request
      .put(`/api/subscribers/${subscriber.id}`)
      .set("x-api-key", apiKey)
      .send({ lists: [] })

    expect(response.status).toBe(400)
    expect(response.body.error).toBe("At least one listId is required")
  })

  it("should reject an unknown list id", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()

    const subscriber = await prisma.subscriber.create({
      data: { email: "test@test.com", organizationId: orgId },
    })

    const response = await request
      .put(`/api/subscribers/${subscriber.id}`)
      .set("x-api-key", apiKey)
      .send({ lists: ["missing-list-id"] })

    expect(response.status).toBe(400)
    expect(response.body.error).toBe("List with id missing-list-id not found")
  })

  it("should reject a list belonging to another organization", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()
    const { orgId: otherOrgId } = await createUser()

    const otherList = await createList({
      name: "Other Org List",
      organizationId: otherOrgId,
    })

    const subscriber = await prisma.subscriber.create({
      data: { email: "test@test.com", organizationId: orgId },
    })

    const response = await request
      .put(`/api/subscribers/${subscriber.id}`)
      .set("x-api-key", apiKey)
      .send({ lists: [otherList.id] })

    expect(response.status).toBe(400)
    expect(response.body.error).toBe(`List with id ${otherList.id} not found`)
  })

  it("should return 404 when updating a subscriber from another organization", async () => {
    const {
      apiKey: { key: apiKey },
    } = await createUser()
    const { orgId: otherOrgId } = await createUser()

    const subscriber = await prisma.subscriber.create({
      data: { email: "theirs@test.com", organizationId: otherOrgId },
    })

    const response = await request
      .put(`/api/subscribers/${subscriber.id}`)
      .set("x-api-key", apiKey)
      .send({ name: "Hijacked" })

    expect(response.status).toBe(404)

    const unchanged = await prisma.subscriber.findUniqueOrThrow({
      where: { id: subscriber.id },
    })
    expect(unchanged.name).toBeNull()
  })
})
