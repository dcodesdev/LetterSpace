import { request } from "@helpers/request"
import { createUser } from "@helpers/user/user"
import { prisma } from "@src/utils/prisma"
import { createList } from "@tests/integration/helpers/list/list"
import { describe, expect, it } from "vitest"

describe("[GET] /api/subscribers", () => {
  it("should get subscribers with pagination", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()

    await Promise.all(
      Array.from({ length: 15 }, (_, i) =>
        prisma.subscriber.create({
          data: {
            email: `test${i}@test.com`,
            name: `Test User ${i}`,
            organizationId: orgId,
          },
        })
      )
    )

    const response = await request
      .get("/api/subscribers?page=1&perPage=10")
      .set("x-api-key", apiKey)

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(10)
    expect(response.body.pagination).toEqual({
      total: 15,
      page: 1,
      perPage: 10,
      totalPages: 2,
      hasMore: true,
    })
  })

  it("should get subscribers with lists", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()

    const list = await createList({
      name: "Test List",
      description: "Test Description",
      organizationId: orgId,
    })

    await prisma.subscriber.create({
      data: {
        email: "test@test.com",
        name: "Test User",
        organizationId: orgId,
        ListSubscribers: {
          create: {
            List: { connect: { id: list.id } },
          },
        },
      },
    })

    const response = await request
      .get("/api/subscribers")
      .set("x-api-key", apiKey)

    expect(response.status).toBe(200)
    expect(response.body.data[0].lists).toHaveLength(1)
    expect(response.body.data[0].lists[0]).toEqual({
      id: list.id,
      name: "Test List",
      description: "Test Description",
    })
  })

  it("should filter subscribers by exact email", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()

    await prisma.subscriber.createMany({
      data: [
        {
          email: "test1@test.com",
          name: "Test User 1",
          organizationId: orgId,
        },
        {
          email: "test2@test.com",
          name: "Test User 2",
          organizationId: orgId,
        },
      ],
    })

    const response = await request
      .get("/api/subscribers?emailEquals=test1@test.com")
      .set("x-api-key", apiKey)

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(1)
    expect(response.body.data[0].email).toBe("test1@test.com")
  })

  it("should filter subscribers by exact name", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()

    await prisma.subscriber.createMany({
      data: [
        {
          email: "test1@test.com",
          name: "Test User 1",
          organizationId: orgId,
        },
        {
          email: "test2@test.com",
          name: "Test User 2",
          organizationId: orgId,
        },
      ],
    })

    const response = await request
      .get("/api/subscribers?nameEquals=Test User 1")
      .set("x-api-key", apiKey)

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(1)
    expect(response.body.data[0].name).toBe("Test User 1")
  })

  it("should only return subscribers from the authenticated organization", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()
    const { orgId: otherOrgId } = await createUser()

    await prisma.subscriber.create({
      data: {
        email: "test1@test.com",
        organizationId: orgId,
      },
    })

    await prisma.subscriber.create({
      data: {
        email: "test2@test.com",
        organizationId: otherOrgId,
      },
    })

    const response = await request
      .get("/api/subscribers")
      .set("x-api-key", apiKey)

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(1)
    expect(response.body.data[0].email).toBe("test1@test.com")
  })

  it("should return 400 for invalid query parameters", async () => {
    const {
      apiKey: { key: apiKey },
    } = await createUser()

    const response = await request
      .get("/api/subscribers?page=invalid")
      .set("x-api-key", apiKey)

    expect(response.status).toBe(400)
    expect(response.body.error).toBeDefined()
  })
})
