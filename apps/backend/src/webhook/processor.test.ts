import {
  createCampaign,
  createMessage,
  createOrganization,
  createSubscriber,
} from "@helpers/factories"
import { prisma } from "@src/utils/prisma"
import { processWebhookEvent } from "@src/webhook/processor"
import { beforeEach, describe, expect, it } from "vitest"

const WEBHOOK_ID = "wh_test"
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

const process = (event: string, error?: string, organizationId = orgId) =>
  processWebhookEvent(
    { organizationId },
    { messageId: EXTERNAL_ID, event, error },
    WEBHOOK_ID
  )

beforeEach(async () => {
  const org = await createOrganization()
  orgId = org.id

  const message = await seedMessage(orgId, EXTERNAL_ID)
  messageDbId = message.id
})

describe("processWebhookEvent", () => {
  it("updates the message status for a known event", async () => {
    const result = await process("delivered")

    expect(result).toEqual({ success: true })

    const message = await prisma.message.findUniqueOrThrow({
      where: { id: messageDbId },
    })
    expect(message.status).toBe("SENT")
    expect(message.error).toBeNull()
  })

  it.each([
    ["pending", "PENDING"],
    ["delayed", "PENDING"],
    ["sent", "SENT"],
    ["opened", "OPENED"],
    ["open", "OPENED"],
    ["clicked", "CLICKED"],
    ["click", "CLICKED"],
    ["bounced", "FAILED"],
    ["complained", "COMPLAINED"],
    ["spam", "COMPLAINED"],
  ])("maps %s to %s", async (event, status) => {
    await process(event)

    const message = await prisma.message.findUniqueOrThrow({
      where: { id: messageDbId },
    })
    expect(message.status).toBe(status)
  })

  it("matches the event case-insensitively", async () => {
    const result = await process("OPENED")

    expect(result).toEqual({ success: true })

    const message = await prisma.message.findUniqueOrThrow({
      where: { id: messageDbId },
    })
    expect(message.status).toBe("OPENED")
  })

  it("applies the default error message for a bounce", async () => {
    await process("bounced")

    const message = await prisma.message.findUniqueOrThrow({
      where: { id: messageDbId },
    })
    expect(message.error).toBe("Email bounced")
  })

  it("prefers the error from the payload", async () => {
    await process("bounced", "mailbox full")

    const message = await prisma.message.findUniqueOrThrow({
      where: { id: messageDbId },
    })
    expect(message.error).toBe("mailbox full")
  })

  it("returns 400 for an unknown event type", async () => {
    const result = await process("teleported")

    expect(result).toEqual({
      success: false,
      status: 400,
      error: "Unknown event type",
    })

    const message = await prisma.message.findUniqueOrThrow({
      where: { id: messageDbId },
    })
    expect(message.status).toBe("SENT")
  })

  it("returns 404 when no message matches the id", async () => {
    const result = await processWebhookEvent(
      { organizationId: orgId },
      { messageId: "does-not-exist", event: "delivered" },
      WEBHOOK_ID
    )

    expect(result).toEqual({
      success: false,
      status: 404,
      error: "Message not found",
    })
  })

  it("does not touch a message belonging to another organization", async () => {
    const otherOrg = await createOrganization()

    const result = await process("opened", undefined, otherOrg.id)

    expect(result).toMatchObject({ success: false, status: 404 })

    const message = await prisma.message.findUniqueOrThrow({
      where: { id: messageDbId },
    })
    expect(message.status).toBe("SENT")
  })

  it("only updates the message in the webhook's organization", async () => {
    const otherOrg = await createOrganization()
    const otherMessage = await seedMessage(otherOrg.id, EXTERNAL_ID)

    await process("clicked")

    const own = await prisma.message.findUniqueOrThrow({
      where: { id: messageDbId },
    })
    const other = await prisma.message.findUniqueOrThrow({
      where: { id: otherMessage.id },
    })

    expect(own.status).toBe("CLICKED")
    expect(other.status).toBe("SENT")
  })
})
