import { describe, it, expect } from "vitest"
import { createUser } from "@helpers/user/user"
import { request } from "@helpers/request"
import { createList } from "@tests/integration/helpers/list/list"

describe("[POST] /api/subscribers", () => {
  it("should create a subscriber", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()
    const list = await createList({
      name: "Test List",
      organizationId: orgId,
      description: "This is a new list for testing",
    })

    const response = await request
      .post("/api/subscribers")
      .set("x-api-key", apiKey)
      .send({
        email: "test@test.com",
        lists: [list.id],
      })

    expect(response.status).toBe(201)
    expect(response.body).toBeDefined()

    const subscriber = response.body
    expect(subscriber.email).toBe("test@test.com")
    expect(subscriber.lists).toBeDefined()
    expect(subscriber.lists.length).toBe(1)
    expect(subscriber.lists[0].id).toBe(list.id)
    subscriber.lists.forEach(
      (list: { name: string; id: string; description: string }) => {
        expect(list.name).toBe("Test List")
        expect(list.description).toBe("This is a new list for testing")
      }
    )
  })

  it("should create a subscriber with existing lists", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()

    const list1 = await createList({
      name: "Test List 1",
      organizationId: orgId,
      description: "This is a new list for testing",
    })

    const list2 = await createList({
      name: "Test List 2",
      organizationId: orgId,
      description: "This is a new list for testing",
    })

    const response = await request
      .post("/api/subscribers")
      .set("x-api-key", apiKey)
      .send({
        email: "test@test.com",
        lists: [list1.id, list2.id],
      })

    expect(response.status).toBe(201)
    expect(response.body).toBeDefined()

    const subscriber = response.body
    expect(subscriber.email).toBe("test@test.com")
    expect(subscriber.lists).toBeDefined()
    expect(subscriber.lists.length).toBe(2)

    subscriber.lists.forEach((list: { id: string }) => {
      expect([list1.id, list2.id]).toContain(list.id)
    })
  })

  it("should create a subscriber that already exists, merge lists and remove duplicates", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()

    const list1 = await createList({
      name: "Test List 1",
      organizationId: orgId,
      description: "This is a new list for testing",
    })

    const list2 = await createList({
      name: "Test List 2",
      organizationId: orgId,
      description: "This is a new list for testing",
    })

    const response = await request
      .post("/api/subscribers")
      .set("x-api-key", apiKey)
      .send({
        email: "test@test.com",
        lists: [list1.id],
      })

    expect(response.status).toBe(201)
    expect(response.body).toBeDefined()

    const subscriber = response.body
    expect(subscriber.email).toBe("test@test.com")
    expect(subscriber.lists).toBeDefined()
    expect(subscriber.lists.length).toBe(1)
    expect(subscriber.lists[0].id).toBe(list1.id)

    const response2 = await request
      .post("/api/subscribers")
      .set("x-api-key", apiKey)
      .send({
        email: "test@test.com",
        lists: [list1.id, list2.id],
      })

    expect(response2.status).toBe(201)
    expect(response2.body).toBeDefined()

    const subscriber2 = response2.body
    expect(subscriber2.email).toBe("test@test.com")
    expect(subscriber2.lists).toBeDefined()
    expect(subscriber2.lists.length).toBe(2)
    expect(subscriber2.lists[0].id).toBe(list2.id)
    expect(subscriber2.lists[1].id).toBe(list1.id)
  })

  it("should reject invalid email format", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()

    const list = await createList({
      name: "Test List",
      organizationId: orgId,
    })

    const response = await request
      .post("/api/subscribers")
      .set("x-api-key", apiKey)
      .send({
        email: "invalid-email",
        lists: [list.id],
      })

    expect(response.status).toBe(400)
    expect(response.body.error).toBe("Invalid email format")
  })

  it("should reject empty lists array", async () => {
    const {
      apiKey: { key: apiKey },
    } = await createUser()

    const response = await request
      .post("/api/subscribers")
      .set("x-api-key", apiKey)
      .send({
        email: "test@test.com",
        lists: [],
      })

    expect(response.status).toBe(400)
    expect(response.body.error).toBe("At least one listId is required")
  })

  it("should create a subscriber with optional name field", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()

    const list = await createList({
      name: "Test List",
      organizationId: orgId,
    })

    const response = await request
      .post("/api/subscribers")
      .set("x-api-key", apiKey)
      .send({
        email: "test@test.com",
        name: "John Doe",
        lists: [list.id],
      })

    expect(response.status).toBe(201)
    expect(response.body.email).toBe("test@test.com")
    expect(response.body.name).toBe("John Doe")
  })

  it("should reject missing required fields", async () => {
    const {
      apiKey: { key: apiKey },
    } = await createUser()

    const response = await request
      .post("/api/subscribers")
      .set("x-api-key", apiKey)
      .send({
        name: "John Doe",
      })

    expect(response.status).toBe(400)
    expect(response.body.error).toBeDefined()
  })

  it("should reject non-existent list IDs", async () => {
    const {
      apiKey: { key: apiKey },
    } = await createUser()

    const response = await request
      .post("/api/subscribers")
      .set("x-api-key", apiKey)
      .send({
        email: "test@test.com",
        lists: ["non-existent-id"],
      })

    expect(response.status).toBe(400)
    expect(response.body.error).toBe("List with id non-existent-id not found")
  })
})
