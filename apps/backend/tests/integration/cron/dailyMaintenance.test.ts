import {
  createCampaign,
  createMessage,
  createOrganization,
  createSubscriber,
} from "@helpers/factories"
import { dailyMaintenanceCron } from "@src/cron/dailyMaintenance"
import { prisma } from "@src/utils/prisma"
import { subDays } from "date-fns"
import { beforeEach, describe, expect, it, vi } from "vitest"

const seedOrg = async (cleanupInterval?: number) => {
  const org = await createOrganization()

  if (cleanupInterval !== undefined) {
    await prisma.generalSettings.updateMany({
      where: { organizationId: org.id },
      data: { cleanupInterval },
    })
  }

  const subscriber = await createSubscriber({ organizationId: org.id })
  const campaign = await createCampaign({ organizationId: org.id })

  return { org, subscriber, campaign }
}

const contentOf = async (id: string) =>
  (await prisma.message.findUniqueOrThrow({ where: { id } })).content

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {})
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("dailyMaintenance cron", () => {
  it("does nothing with no organizations", async () => {
    await expect(dailyMaintenanceCron()).resolves.toBeUndefined()
  })

  it("does nothing when there are no messages", async () => {
    await seedOrg()

    await expect(dailyMaintenanceCron()).resolves.toBeUndefined()
  })

  it("clears the content of an old completed message", async () => {
    const { subscriber, campaign } = await seedOrg(30)
    const message = await createMessage({
      campaignId: campaign.id,
      subscriberId: subscriber.id,
      status: "SENT",
      content: "<p>Old</p>",
      createdAt: subDays(new Date(), 60),
    })

    await dailyMaintenanceCron()

    expect(await contentOf(message.id)).toBeNull()
  })

  it("keeps a message created inside the cleanup window", async () => {
    const { subscriber, campaign } = await seedOrg(30)
    const message = await createMessage({
      campaignId: campaign.id,
      subscriberId: subscriber.id,
      status: "SENT",
      content: "<p>Recent</p>",
      createdAt: subDays(new Date(), 10),
    })

    await dailyMaintenanceCron()

    expect(await contentOf(message.id)).toBe("<p>Recent</p>")
  })

  it("does not delete the message row itself", async () => {
    const { subscriber, campaign } = await seedOrg(30)
    const message = await createMessage({
      campaignId: campaign.id,
      subscriberId: subscriber.id,
      status: "SENT",
      createdAt: subDays(new Date(), 60),
    })

    await dailyMaintenanceCron()

    const stored = await prisma.message.findUniqueOrThrow({
      where: { id: message.id },
    })
    expect(stored.status).toBe("SENT")
  })

  it.each(["QUEUED", "PENDING", "RETRYING"] as const)(
    "keeps the content of an old %s message",
    async (status) => {
      const { subscriber, campaign } = await seedOrg(30)
      const message = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status,
        content: "<p>Pending</p>",
        createdAt: subDays(new Date(), 60),
      })

      await dailyMaintenanceCron()

      expect(await contentOf(message.id)).toBe("<p>Pending</p>")
    }
  )

  it.each([
    "SENT",
    "OPENED",
    "CLICKED",
    "FAILED",
    "CANCELLED",
    "COMPLAINED",
  ] as const)("clears the content of an old %s message", async (status) => {
    const { subscriber, campaign } = await seedOrg(30)
    const message = await createMessage({
      campaignId: campaign.id,
      subscriberId: subscriber.id,
      status,
      content: "<p>Old</p>",
      createdAt: subDays(new Date(), 60),
    })

    await dailyMaintenanceCron()

    expect(await contentOf(message.id)).toBeNull()
  })

  it("honours a per-organization cleanup interval", async () => {
    const shortInterval = await seedOrg(7)
    const longInterval = await seedOrg(365)

    const cleaned = await createMessage({
      campaignId: shortInterval.campaign.id,
      subscriberId: shortInterval.subscriber.id,
      status: "SENT",
      content: "<p>Old</p>",
      createdAt: subDays(new Date(), 30),
    })
    const kept = await createMessage({
      campaignId: longInterval.campaign.id,
      subscriberId: longInterval.subscriber.id,
      status: "SENT",
      content: "<p>Old</p>",
      createdAt: subDays(new Date(), 30),
    })

    await dailyMaintenanceCron()

    expect(await contentOf(cleaned.id)).toBeNull()
    expect(await contentOf(kept.id)).toBe("<p>Old</p>")
  })

  it("uses the schema default of 90 days when the interval is untouched", async () => {
    const { subscriber, campaign } = await seedOrg()

    const kept = await createMessage({
      campaignId: campaign.id,
      subscriberId: subscriber.id,
      status: "SENT",
      content: "<p>Sixty</p>",
      createdAt: subDays(new Date(), 60),
    })
    const cleaned = await createMessage({
      campaignId: campaign.id,
      subscriberId: subscriber.id,
      status: "SENT",
      content: "<p>Hundred</p>",
      createdAt: subDays(new Date(), 100),
    })

    await dailyMaintenanceCron()

    expect(await contentOf(kept.id)).toBe("<p>Sixty</p>")
    expect(await contentOf(cleaned.id)).toBeNull()
  })

  it("is idempotent across runs", async () => {
    const { subscriber, campaign } = await seedOrg(30)
    const message = await createMessage({
      campaignId: campaign.id,
      subscriberId: subscriber.id,
      status: "SENT",
      createdAt: subDays(new Date(), 60),
    })

    await dailyMaintenanceCron()
    await dailyMaintenanceCron()

    expect(await contentOf(message.id)).toBeNull()
    expect(await prisma.message.count()).toBe(1)
  })
})
