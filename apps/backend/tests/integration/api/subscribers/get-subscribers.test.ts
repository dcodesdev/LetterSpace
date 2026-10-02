import { createList, createUser } from "@helpers/factories"
import { request } from "@helpers/request"
import { prisma } from "@src/utils/prisma"
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
  it("should return the second page of results", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()

    for (let i = 0; i < 15; i++) {
      await prisma.subscriber.create({
        data: { email: `test${i}@test.com`, organizationId: orgId },
      })
    }

    const response = await request
      .get("/api/subscribers?page=2&perPage=10")
      .set("x-api-key", apiKey)

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(5)
    expect(response.body.pagination).toEqual({
      total: 15,
      page: 2,
      perPage: 10,
      totalPages: 2,
      hasMore: false,
    })
  })

  it("should default to page 1 with perPage 100", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()

    await prisma.subscriber.create({
      data: { email: "test@test.com", organizationId: orgId },
    })

    const response = await request
      .get("/api/subscribers")
      .set("x-api-key", apiKey)

    expect(response.status).toBe(200)
    expect(response.body.pagination).toEqual({
      total: 1,
      page: 1,
      perPage: 100,
      totalPages: 1,
      hasMore: false,
    })
  })

  it("should return an empty page past the end of the results", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()

    await prisma.subscriber.create({
      data: { email: "test@test.com", organizationId: orgId },
    })

    const response = await request
      .get("/api/subscribers?page=5&perPage=10")
      .set("x-api-key", apiKey)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([])
    expect(response.body.pagination.hasMore).toBe(false)
  })

  it("should combine the email and name filters", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()

    await prisma.subscriber.createMany({
      data: [
        { email: "test1@test.com", name: "Alice", organizationId: orgId },
        { email: "test2@test.com", name: "Alice", organizationId: orgId },
      ],
    })

    const response = await request
      .get("/api/subscribers?emailEquals=test1@test.com&nameEquals=Alice")
      .set("x-api-key", apiKey)

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(1)
    expect(response.body.data[0].email).toBe("test1@test.com")
  })

  it("should return an empty result for a filter that matches nothing", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()

    await prisma.subscriber.create({
      data: { email: "test@test.com", organizationId: orgId },
    })

    const response = await request
      .get("/api/subscribers?emailEquals=nobody@test.com")
      .set("x-api-key", apiKey)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([])
    expect(response.body.pagination.total).toBe(0)
  })

  it("should not match a subscriber from another organization by email filter", async () => {
    const {
      apiKey: { key: apiKey },
    } = await createUser()
    const { orgId: otherOrgId } = await createUser()

    await prisma.subscriber.create({
      data: { email: "theirs@test.com", organizationId: otherOrgId },
    })

    const response = await request
      .get("/api/subscribers?emailEquals=theirs@test.com")
      .set("x-api-key", apiKey)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([])
  })

  it("should return 400 for a non-positive page number", async () => {
    const {
      apiKey: { key: apiKey },
    } = await createUser()

    const response = await request
      .get("/api/subscribers?page=0")
      .set("x-api-key", apiKey)

    expect(response.status).toBe(400)
    expect(response.body.error).toBe("Invalid page number")
  })

  it("should return 400 for an invalid perPage value", async () => {
    const {
      apiKey: { key: apiKey },
    } = await createUser()

    const response = await request
      .get("/api/subscribers?perPage=-1")
      .set("x-api-key", apiKey)

    expect(response.status).toBe(400)
    expect(response.body.error).toBe("Invalid perPage number")
  })
})
