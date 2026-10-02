import { createList, createUser } from "@helpers/factories"
import { request } from "@helpers/request"
import { prisma } from "@src/utils/prisma"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const sendMail = vi.fn()
  return { sendMail, createTransport: vi.fn(() => ({ sendMail })) }
})

vi.mock("nodemailer", () => ({
  default: { createTransport: mocks.createTransport },
}))

const { sendMail } = mocks

beforeEach(() => {
  vi.clearAllMocks()
  sendMail.mockResolvedValue({
    accepted: ["optin@example.com"],
    rejected: [],
    messageId: "<verify-id@test>",
  })
})

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

  it("should create a subscriber with doubleOptIn true, send verification email, and set emailVerified to false", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()

    await prisma.smtpSettings.updateMany({
      where: { organizationId: orgId },
      data: { fromEmail: "sender@example.com" },
    })

    await prisma.generalSettings.upsert({
      where: { organizationId: orgId },
      update: { baseURL: "http://localhost:3000" },
      create: { organizationId: orgId, baseURL: "http://localhost:3000" },
    })

    const list = await createList({
      name: "Double Opt-In List",
      organizationId: orgId,
    })

    const response = await request
      .post("/api/subscribers")
      .set("x-api-key", apiKey)
      .send({
        email: "optin@example.com",
        lists: [list.id],
        doubleOptIn: true,
      })

    expect(response.status).toBe(201)

    const subscriber = response.body
    expect(subscriber.email).toBe("optin@example.com")
    expect(subscriber.lists).toHaveLength(1)
    expect(subscriber.lists[0].id).toBe(list.id)
    expect(subscriber.emailVerified).toBe(false)

    const dbSubscriber = await prisma.subscriber.findUniqueOrThrow({
      where: { id: subscriber.id },
    })
    expect(dbSubscriber.emailVerified).toBe(false)
    expect(dbSubscriber.emailVerificationToken).toBeTruthy()

    expect(sendMail).toHaveBeenCalledTimes(1)
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["optin@example.com"],
        from: "sender@example.com",
      })
    )
  })

  it("should not put a raw HTML name into the verification email", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()

    await prisma.smtpSettings.updateMany({
      where: { organizationId: orgId },
      data: { fromEmail: "sender@example.com" },
    })

    await prisma.generalSettings.upsert({
      where: { organizationId: orgId },
      update: { baseURL: "http://localhost:3000" },
      create: { organizationId: orgId, baseURL: "http://localhost:3000" },
    })

    const list = await createList({ organizationId: orgId })

    const response = await request
      .post("/api/subscribers")
      .set("x-api-key", apiKey)
      .send({
        email: "optin@example.com",
        name: `<b>Bob</b> & "Al's" $'`,
        lists: [list.id],
        doubleOptIn: true,
      })

    expect(response.status).toBe(201)
    expect(sendMail).toHaveBeenCalledTimes(1)

    const { html } = sendMail.mock.calls[0]![0] as { html: string }
    expect(html).toContain("/verify-email?token=")
    expect(html).not.toContain("<b>Bob</b>")
  })

  it("should reject a list belonging to another organization", async () => {
    const {
      apiKey: { key: apiKey },
    } = await createUser()
    const { orgId: otherOrgId } = await createUser()

    const otherList = await createList({
      name: "Other Org List",
      organizationId: otherOrgId,
    })

    const response = await request
      .post("/api/subscribers")
      .set("x-api-key", apiKey)
      .send({ email: "test@test.com", lists: [otherList.id] })

    expect(response.status).toBe(400)
    expect(response.body.error).toBe(`List with id ${otherList.id} not found`)
    expect(await prisma.subscriber.count()).toBe(0)
  })

  it("should allow the same email in two different organizations", async () => {
    const {
      apiKey: { key: apiKey },
      orgId,
    } = await createUser()
    const {
      apiKey: { key: otherApiKey },
      orgId: otherOrgId,
    } = await createUser()

    const list = await createList({ name: "List", organizationId: orgId })
    const otherList = await createList({
      name: "Other List",
      organizationId: otherOrgId,
    })

    const first = await request
      .post("/api/subscribers")
      .set("x-api-key", apiKey)
      .send({ email: "shared@test.com", lists: [list.id] })

    const second = await request
      .post("/api/subscribers")
      .set("x-api-key", otherApiKey)
      .send({ email: "shared@test.com", lists: [otherList.id] })

    expect(first.status).toBe(201)
    expect(second.status).toBe(201)
    expect(first.body.id).not.toBe(second.body.id)
    expect(
      await prisma.subscriber.count({ where: { organizationId: orgId } })
    ).toBe(1)
    expect(
      await prisma.subscriber.count({ where: { organizationId: otherOrgId } })
    ).toBe(1)
  })
})
