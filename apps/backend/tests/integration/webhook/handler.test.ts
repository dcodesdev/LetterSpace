import {
  createCampaign,
  createMessage,
  createOrganization,
  createSubscriber,
  createWebhook,
} from "@helpers/factories"
import { request } from "@helpers/request"
import { waitFor } from "@helpers/wait-for"
import { logger } from "@src/utils/logger"
import { prisma } from "@src/utils/prisma"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const EXTERNAL_ID = "external-message-id"

let orgId: string
let messageDbId: string

const seedMessage = async (organizationId: string, messageId: string) => {
  const campaign = await createCampaign({ organizationId })
  const subscriber = await createSubscriber({ organizationId })

  return createMessage({
    campaignId: campaign.id,
    subscriberId: subscriber.id,
    status: "SENT",
    messageId,
  })
}

/**
 * The handler writes its log in a `finally` block that is not awaited by the
 * response, so log assertions have to poll.
 */
const waitForLog = (webhookId: string) =>
  waitFor(async () => {
    const log = await prisma.webhookLog.findFirst({ where: { webhookId } })
    expect(log).not.toBeNull()
  }).then(() => prisma.webhookLog.findFirstOrThrow({ where: { webhookId } }))

beforeEach(async () => {
  const org = await createOrganization()
  orgId = org.id

  const message = await seedMessage(orgId, EXTERNAL_ID)
  messageDbId = message.id
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("POST /webhook/:webhookId", () => {
  it("returns 404 for an unknown webhook id", async () => {
    const response = await request
      .post("/webhook/00000000-0000-0000-0000-000000000000")
      .send({ messageId: EXTERNAL_ID, event: "delivered" })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: "Webhook not found or inactive" })
  })

  it("returns 404 for an inactive webhook", async () => {
    const webhook = await createWebhook({
      organizationId: orgId,
      isActive: false,
    })

    const response = await request
      .post(`/webhook/${webhook.id}`)
      .send({ messageId: EXTERNAL_ID, event: "delivered" })

    expect(response.status).toBe(404)
  })

  it("processes a valid event and updates the message", async () => {
    const webhook = await createWebhook({ organizationId: orgId })

    const response = await request
      .post(`/webhook/${webhook.id}`)
      .send({ messageId: EXTERNAL_ID, event: "opened" })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ success: true })

    const message = await prisma.message.findUniqueOrThrow({
      where: { id: messageDbId },
    })
    expect(message.status).toBe("OPENED")
  })

  it("returns 400 for a payload missing messageId", async () => {
    const webhook = await createWebhook({ organizationId: orgId })

    const response = await request
      .post(`/webhook/${webhook.id}`)
      .send({ event: "opened" })

    expect(response.status).toBe(400)
    expect(response.body.error).toContain("messageId")
  })

  it("returns 401 when the authorization code rejects the request", async () => {
    const webhook = await createWebhook({
      organizationId: orgId,
      authCode: `function authorize(headers) {
        return headers['x-secret'] === 'letmein'
      }`,
    })

    const response = await request
      .post(`/webhook/${webhook.id}`)
      .send({ messageId: EXTERNAL_ID, event: "opened" })

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: "Unauthorized" })

    const message = await prisma.message.findUniqueOrThrow({
      where: { id: messageDbId },
    })
    expect(message.status).toBe("SENT")
  })

  it("fails with a timeout when the authorization code never returns", async () => {
    const webhook = await createWebhook({
      organizationId: orgId,
      authCode: `function authorize() { while (true) {} }`,
    })

    const response = await request
      .post(`/webhook/${webhook.id}`)
      .send({ messageId: EXTERNAL_ID, event: "opened" })

    expect(response.status).toBe(500)
    expect(response.body.error).toContain("timed out")

    const message = await prisma.message.findUniqueOrThrow({
      where: { id: messageDbId },
    })
    expect(message.status).toBe("SENT")
  }, 15_000)

  it("processes the event when the authorization code accepts", async () => {
    const webhook = await createWebhook({
      organizationId: orgId,
      authCode: `function authorize(headers) {
        return headers['x-secret'] === 'letmein'
      }`,
    })

    const response = await request
      .post(`/webhook/${webhook.id}`)
      .set("x-secret", "letmein")
      .send({ messageId: EXTERNAL_ID, event: "clicked" })

    expect(response.status).toBe(200)

    const message = await prisma.message.findUniqueOrThrow({
      where: { id: messageDbId },
    })
    expect(message.status).toBe("CLICKED")
  })

  it("applies the transform code to a custom payload shape", async () => {
    const webhook = await createWebhook({
      organizationId: orgId,
      transformCode: `function transform(payload) {
        return { messageId: payload.data.id, event: payload.type }
      }`,
    })

    const response = await request
      .post(`/webhook/${webhook.id}`)
      .send({ type: "bounced", data: { id: EXTERNAL_ID } })

    expect(response.status).toBe(200)

    const message = await prisma.message.findUniqueOrThrow({
      where: { id: messageDbId },
    })
    expect(message.status).toBe("FAILED")
    expect(message.error).toBe("Email bounced")
  })

  it("updates the message when the transformed error has quotes and newlines", async () => {
    const reason = '550 "mailbox unavailable"\nat C:\\spool'
    const webhook = await createWebhook({
      organizationId: orgId,
      transformCode: `function transform(payload) {
        return { messageId: payload.id, event: 'bounced', error: payload.reason }
      }`,
    })

    const response = await request
      .post(`/webhook/${webhook.id}`)
      .send({ id: EXTERNAL_ID, reason })

    expect(response.status).toBe(200)

    const message = await prisma.message.findUniqueOrThrow({
      where: { id: messageDbId },
    })
    expect(message.status).toBe("FAILED")
    expect(message.error).toBe(reason)
  })

  it("returns 500 when the transform code throws", async () => {
    const webhook = await createWebhook({
      organizationId: orgId,
      transformCode: `function transform() { throw new Error('boom') }`,
    })

    const response = await request
      .post(`/webhook/${webhook.id}`)
      .send({ messageId: EXTERNAL_ID, event: "opened" })

    expect(response.status).toBe(500)
    expect(response.body.error).toContain("Transform code error")
  })

  it("does not update a message from another organization", async () => {
    const otherOrg = await createOrganization()
    const webhook = await createWebhook({ organizationId: otherOrg.id })

    const response = await request
      .post(`/webhook/${webhook.id}`)
      .send({ messageId: EXTERNAL_ID, event: "opened" })

    expect(response.status).toBe(200)

    const message = await prisma.message.findUniqueOrThrow({
      where: { id: messageDbId },
    })
    expect(message.status).toBe("SENT")
  })
})

describe("webhook logging", () => {
  it("writes no log for an unknown webhook id", async () => {
    const errorSpy = vi.spyOn(logger, "error")
    const unknownId = "00000000-0000-0000-0000-000000000000"

    const response = await request
      .post(`/webhook/${unknownId}`)
      .send({ messageId: EXTERNAL_ID, event: "opened" })

    expect(response.status).toBe(404)

    // A later request's log landing means the unknown id's finally has run
    const webhook = await createWebhook({ organizationId: orgId })
    await request
      .post(`/webhook/${webhook.id}`)
      .send({ messageId: EXTERNAL_ID, event: "opened" })
    await waitForLog(webhook.id)

    expect(
      await prisma.webhookLog.count({ where: { webhookId: unknownId } })
    ).toBe(0)
    expect(errorSpy).not.toHaveBeenCalledWith(
      "Failed to log webhook request:",
      expect.anything()
    )
  })

  it("writes a log for an inactive webhook", async () => {
    const webhook = await createWebhook({
      organizationId: orgId,
      isActive: false,
    })

    await request
      .post(`/webhook/${webhook.id}`)
      .send({ messageId: EXTERNAL_ID, event: "opened" })

    const log = await waitForLog(webhook.id)

    expect(log.responseCode).toBe(404)
    expect(log.error).toBeNull()
  })

  it("writes a log for a successful run", async () => {
    const webhook = await createWebhook({ organizationId: orgId })

    await request
      .post(`/webhook/${webhook.id}`)
      .send({ messageId: EXTERNAL_ID, event: "opened" })

    const log = await waitForLog(webhook.id)

    expect(log.responseCode).toBe(200)
    expect(log.responseBody).toBe(JSON.stringify({ success: true }))
    expect(log.error).toBeNull()
    expect(log.requestBody).toEqual({
      messageId: EXTERNAL_ID,
      event: "opened",
    })
    expect(log.transformedPayload).toEqual({
      messageId: EXTERNAL_ID,
      event: "opened",
    })
    expect(log.duration).toBeGreaterThanOrEqual(0)
  })

  it("writes a log with the error for a failed authorization", async () => {
    const webhook = await createWebhook({
      organizationId: orgId,
      authCode: `function authorize() { return false }`,
    })

    await request
      .post(`/webhook/${webhook.id}`)
      .send({ messageId: EXTERNAL_ID, event: "opened" })

    const log = await waitForLog(webhook.id)

    expect(log.responseCode).toBe(401)
    expect(log.error).toBe("Unauthorized")
    expect(log.transformedPayload).toBeNull()
  })

  it("writes a log with the error for an invalid payload", async () => {
    const webhook = await createWebhook({ organizationId: orgId })

    await request.post(`/webhook/${webhook.id}`).send({ event: "opened" })

    const log = await waitForLog(webhook.id)

    expect(log.responseCode).toBe(400)
    expect(log.error).toContain("messageId")
  })
})
