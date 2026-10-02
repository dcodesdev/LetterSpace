import {
  createCampaign,
  createList,
  createMessage,
  createOrganization,
  createSubscriber,
  createTemplate,
} from "@helpers/factories"
import { processQueuedCampaigns } from "@src/cron/processQueuedCampaigns"
import { prisma } from "@src/utils/prisma"
import { addDays, subDays } from "date-fns"
import { beforeEach, describe, expect, it, vi } from "vitest"

const BASE_URL = "https://mail.example.com"

const seedOrg = async ({
  baseURL = BASE_URL,
}: { baseURL?: string | null } = {}) => {
  const org = await createOrganization()

  await prisma.generalSettings.updateMany({
    where: { organizationId: org.id },
    data: { baseURL },
  })

  const list = await createList({ organizationId: org.id })

  return { org, list }
}

const messagesFor = (campaignId: string) =>
  prisma.message.findMany({ where: { campaignId } })

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {})
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("processQueuedCampaigns cron", () => {
  describe("no-op cases", () => {
    it("does nothing with no campaigns", async () => {
      await expect(processQueuedCampaigns()).resolves.toBeUndefined()
      expect(await prisma.message.count()).toBe(0)
    })

    it.each([
      "DRAFT",
      "SCHEDULED",
      "SENDING",
      "COMPLETED",
      "CANCELLED",
    ] as const)("ignores a %s campaign", async (status) => {
      const { org, list } = await seedOrg()
      await createSubscriber({ organizationId: org.id, listIds: [list.id] })
      const campaign = await createCampaign({
        organizationId: org.id,
        status,
        listIds: [list.id],
      })

      await processQueuedCampaigns()

      expect(await messagesFor(campaign.id)).toHaveLength(0)
    })

    it("skips a campaign with no content", async () => {
      const { org, list } = await seedOrg()
      await createSubscriber({ organizationId: org.id, listIds: [list.id] })
      const campaign = await createCampaign({
        organizationId: org.id,
        status: "CREATING",
        listIds: [list.id],
      })
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { content: null },
      })

      await processQueuedCampaigns()

      expect(await messagesFor(campaign.id)).toHaveLength(0)
      const stored = await prisma.campaign.findUniqueOrThrow({
        where: { id: campaign.id },
      })
      expect(stored.status).toBe("CREATING")
    })

    it("skips a campaign with no subject", async () => {
      const { org, list } = await seedOrg()
      await createSubscriber({ organizationId: org.id, listIds: [list.id] })
      const campaign = await createCampaign({
        organizationId: org.id,
        status: "CREATING",
        listIds: [list.id],
      })
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { subject: null },
      })

      await processQueuedCampaigns()

      expect(await messagesFor(campaign.id)).toHaveLength(0)
    })

    it("skips a campaign whose organization has no baseURL", async () => {
      const { org, list } = await seedOrg({ baseURL: null })
      await createSubscriber({ organizationId: org.id, listIds: [list.id] })
      const campaign = await createCampaign({
        organizationId: org.id,
        status: "CREATING",
        listIds: [list.id],
      })

      await processQueuedCampaigns()

      expect(await messagesFor(campaign.id)).toHaveLength(0)
    })

    it("skips a campaign with no lists", async () => {
      const { org } = await seedOrg()
      const campaign = await createCampaign({
        organizationId: org.id,
        status: "CREATING",
      })

      await processQueuedCampaigns()

      expect(await messagesFor(campaign.id)).toHaveLength(0)
      const stored = await prisma.campaign.findUniqueOrThrow({
        where: { id: campaign.id },
      })
      expect(stored.status).toBe("CREATING")
    })

    it("skips a campaign whose lists have no subscribers", async () => {
      const { org, list } = await seedOrg()
      const campaign = await createCampaign({
        organizationId: org.id,
        status: "CREATING",
        listIds: [list.id],
      })

      await processQueuedCampaigns()

      expect(await messagesFor(campaign.id)).toHaveLength(0)
    })
  })

  describe("message creation", () => {
    it("creates a QUEUED message for every list subscriber", async () => {
      const { org, list } = await seedOrg()
      const subscribers = await Promise.all([
        createSubscriber({ organizationId: org.id, listIds: [list.id] }),
        createSubscriber({ organizationId: org.id, listIds: [list.id] }),
        createSubscriber({ organizationId: org.id, listIds: [list.id] }),
      ])
      const campaign = await createCampaign({
        organizationId: org.id,
        status: "CREATING",
        listIds: [list.id],
      })

      await processQueuedCampaigns()

      const messages = await messagesFor(campaign.id)
      expect(messages).toHaveLength(3)
      expect(messages.every((m) => m.status === "QUEUED")).toBe(true)
      expect(new Set(messages.map((m) => m.subscriberId))).toEqual(
        new Set(subscribers.map((s) => s.id))
      )
    })

    it("moves the campaign to SENDING once every subscriber has a message", async () => {
      const { org, list } = await seedOrg()
      await createSubscriber({ organizationId: org.id, listIds: [list.id] })
      const campaign = await createCampaign({
        organizationId: org.id,
        status: "CREATING",
        listIds: [list.id],
      })

      await processQueuedCampaigns()

      const stored = await prisma.campaign.findUniqueOrThrow({
        where: { id: campaign.id },
      })
      expect(stored.status).toBe("SENDING")
    })

    it("skips unsubscribed list members", async () => {
      const { org, list } = await seedOrg()
      const active = await createSubscriber({
        organizationId: org.id,
        listIds: [list.id],
      })
      const gone = await createSubscriber({
        organizationId: org.id,
        listIds: [list.id],
      })
      await prisma.listSubscriber.updateMany({
        where: { subscriberId: gone.id },
        data: { unsubscribedAt: new Date() },
      })
      const campaign = await createCampaign({
        organizationId: org.id,
        status: "CREATING",
        listIds: [list.id],
      })

      await processQueuedCampaigns()

      const messages = await messagesFor(campaign.id)
      expect(messages).toHaveLength(1)
      expect(messages[0]?.subscriberId).toBe(active.id)
    })

    it("creates one message per subscriber across two lists", async () => {
      const { org, list } = await seedOrg()
      const second = await createList({ organizationId: org.id })
      const subscriber = await createSubscriber({
        organizationId: org.id,
        listIds: [list.id, second.id],
      })
      const campaign = await createCampaign({
        organizationId: org.id,
        status: "CREATING",
        listIds: [list.id, second.id],
      })

      await processQueuedCampaigns()

      const messages = await messagesFor(campaign.id)
      expect(messages).toHaveLength(1)
      expect(messages[0]?.subscriberId).toBe(subscriber.id)
    })

    it("ignores subscribers who are not on any of the campaign's lists", async () => {
      const { org, list } = await seedOrg()
      const other = await createList({ organizationId: org.id })
      await createSubscriber({ organizationId: org.id, listIds: [other.id] })
      const campaign = await createCampaign({
        organizationId: org.id,
        status: "CREATING",
        listIds: [list.id],
      })

      await processQueuedCampaigns()

      expect(await messagesFor(campaign.id)).toHaveLength(0)
    })

    it("processes campaigns for several organizations in one run", async () => {
      const first = await seedOrg()
      const second = await seedOrg()
      await createSubscriber({
        organizationId: first.org.id,
        listIds: [first.list.id],
      })
      await createSubscriber({
        organizationId: second.org.id,
        listIds: [second.list.id],
      })
      const a = await createCampaign({
        organizationId: first.org.id,
        status: "CREATING",
        listIds: [first.list.id],
      })
      const b = await createCampaign({
        organizationId: second.org.id,
        status: "CREATING",
        listIds: [second.list.id],
      })

      await processQueuedCampaigns()

      expect(await messagesFor(a.id)).toHaveLength(1)
      expect(await messagesFor(b.id)).toHaveLength(1)
    })

    it("caps a single run at the batch size", async () => {
      const { org, list } = await seedOrg()
      await prisma.subscriber.createMany({
        data: Array.from({ length: 105 }, (_, i) => ({
          email: `batch-${i}@example.com`,
          organizationId: org.id,
        })),
      })
      const subscribers = await prisma.subscriber.findMany({
        where: { organizationId: org.id },
      })
      await prisma.listSubscriber.createMany({
        data: subscribers.map((s) => ({ listId: list.id, subscriberId: s.id })),
      })
      const campaign = await createCampaign({
        organizationId: org.id,
        status: "CREATING",
        listIds: [list.id],
      })

      await processQueuedCampaigns()

      expect(await messagesFor(campaign.id)).toHaveLength(100)
      const stored = await prisma.campaign.findUniqueOrThrow({
        where: { id: campaign.id },
      })
      expect(stored.status).toBe("CREATING")

      await processQueuedCampaigns()

      expect(await messagesFor(campaign.id)).toHaveLength(105)
      const finished = await prisma.campaign.findUniqueOrThrow({
        where: { id: campaign.id },
      })
      expect(finished.status).toBe("SENDING")
    })
  })

  describe("idempotency", () => {
    it("creates no extra messages on a second run", async () => {
      const { org, list } = await seedOrg()
      await createSubscriber({ organizationId: org.id, listIds: [list.id] })
      const campaign = await createCampaign({
        organizationId: org.id,
        status: "CREATING",
        listIds: [list.id],
      })

      await processQueuedCampaigns()
      const first = await messagesFor(campaign.id)

      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: "CREATING" },
      })
      await processQueuedCampaigns()

      const second = await messagesFor(campaign.id)
      expect(second).toHaveLength(first.length)
      expect(second.map((m) => m.id)).toEqual(first.map((m) => m.id))
    })

    it("does not re-create a message for a subscriber who already has one", async () => {
      const { org, list } = await seedOrg()
      const existing = await createSubscriber({
        organizationId: org.id,
        listIds: [list.id],
      })
      const fresh = await createSubscriber({
        organizationId: org.id,
        listIds: [list.id],
      })
      const campaign = await createCampaign({
        organizationId: org.id,
        status: "CREATING",
        listIds: [list.id],
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: existing.id,
        status: "SENT",
      })

      await processQueuedCampaigns()

      const messages = await messagesFor(campaign.id)
      expect(messages).toHaveLength(2)
      expect(messages.find((m) => m.subscriberId === existing.id)?.status).toBe(
        "SENT"
      )
      expect(messages.find((m) => m.subscriberId === fresh.id)?.status).toBe(
        "QUEUED"
      )
    })
  })

  describe("rendered content", () => {
    it("replaces placeholders with subscriber and campaign data", async () => {
      const { org, list } = await seedOrg()
      const subscriber = await createSubscriber({
        organizationId: org.id,
        listIds: [list.id],
        name: "Ada",
        email: "ada@example.com",
      })
      const campaign = await createCampaign({
        organizationId: org.id,
        status: "CREATING",
        listIds: [list.id],
        title: "Weekly",
        subject: "Digest",
        content:
          "<p>{{subscriber.name}} {{subscriber.email}} {{campaign.name}} {{campaign.subject}} {{organization.name}}</p>",
      })

      await processQueuedCampaigns()

      const [message] = await messagesFor(campaign.id)
      expect(message?.content).toContain("Ada")
      expect(message?.content).toContain(subscriber.email)
      expect(message?.content).toContain("Weekly")
      expect(message?.content).toContain("Digest")
      expect(message?.content).toContain(org.name)
    })

    it("renders subscriber metadata placeholders", async () => {
      const { org, list } = await seedOrg()
      const subscriber = await createSubscriber({
        organizationId: org.id,
        listIds: [list.id],
      })
      await prisma.subscriberMetadata.create({
        data: { subscriberId: subscriber.id, key: "plan", value: "pro" },
      })
      const campaign = await createCampaign({
        organizationId: org.id,
        status: "CREATING",
        listIds: [list.id],
        content: "<p>Plan: {{subscriber.metadata.plan}}</p>",
      })

      await processQueuedCampaigns()

      const [message] = await messagesFor(campaign.id)
      expect(message?.content).toContain("Plan: pro")
    })

    it("builds an unsubscribe link carrying the subscriber, campaign and message ids", async () => {
      const { org, list } = await seedOrg()
      const subscriber = await createSubscriber({
        organizationId: org.id,
        listIds: [list.id],
      })
      const campaign = await createCampaign({
        organizationId: org.id,
        status: "CREATING",
        listIds: [list.id],
        content: "<p><a href='{{unsubscribe_link}}'>out</a></p>",
      })

      await processQueuedCampaigns()

      const [message] = await messagesFor(campaign.id)
      expect(message?.content).toContain(
        `${BASE_URL}/unsubscribe?sid=${subscriber.id}&cid=${campaign.id}&mid=${message?.id}`
      )
    })

    it("wraps the content in the campaign template", async () => {
      const { org, list } = await seedOrg()
      await createSubscriber({ organizationId: org.id, listIds: [list.id] })
      const template = await createTemplate({
        organizationId: org.id,
        content: "<html><body>{{content}}</body></html>",
      })
      const campaign = await createCampaign({
        organizationId: org.id,
        status: "CREATING",
        listIds: [list.id],
        templateId: template.id,
        content: "<p>Inner</p>",
      })

      await processQueuedCampaigns()

      const [message] = await messagesFor(campaign.id)
      expect(message?.content).toContain("<html><body><p>Inner</p>")
    })

    it("appends an open tracking pixel when open tracking is on", async () => {
      const { org, list } = await seedOrg()
      await createSubscriber({ organizationId: org.id, listIds: [list.id] })
      const campaign = await createCampaign({
        organizationId: org.id,
        status: "CREATING",
        listIds: [list.id],
      })

      await processQueuedCampaigns()

      const [message] = await messagesFor(campaign.id)
      expect(message?.content).toContain(
        `${BASE_URL}/img/${message?.id}/img.png`
      )
    })

    it("omits the tracking pixel when open tracking is off", async () => {
      const { org, list } = await seedOrg()
      await createSubscriber({ organizationId: org.id, listIds: [list.id] })
      const campaign = await createCampaign({
        organizationId: org.id,
        status: "CREATING",
        listIds: [list.id],
      })
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { openTracking: false },
      })

      await processQueuedCampaigns()

      const [message] = await messagesFor(campaign.id)
      expect(message?.content).not.toContain("/img.png")
    })

    it("rewrites @TRACK links through the link tracker", async () => {
      const { org, list } = await seedOrg()
      await createSubscriber({ organizationId: org.id, listIds: [list.id] })
      const campaign = await createCampaign({
        organizationId: org.id,
        status: "CREATING",
        listIds: [list.id],
        content: '<a href="https://example.com/post@TRACK">Read</a>',
      })

      await processQueuedCampaigns()

      const trackedLink = await prisma.trackedLink.findFirstOrThrow({
        where: { campaignId: campaign.id },
      })
      expect(trackedLink.url).toBe("https://example.com/post")

      const [message] = await messagesFor(campaign.id)
      expect(message?.content).toContain(`${BASE_URL}/r/${trackedLink.id}`)
      expect(message?.content).not.toContain("@TRACK")
    })

    it("leaves untagged links untouched", async () => {
      const { org, list } = await seedOrg()
      await createSubscriber({ organizationId: org.id, listIds: [list.id] })
      const campaign = await createCampaign({
        organizationId: org.id,
        status: "CREATING",
        listIds: [list.id],
        content: '<a href="https://example.com/post">Read</a>',
      })

      await processQueuedCampaigns()

      expect(await prisma.trackedLink.count()).toBe(0)
      const [message] = await messagesFor(campaign.id)
      expect(message?.content).toContain('href="https://example.com/post"')
    })
  })

  describe("scheduled campaigns", () => {
    it("ignores a campaign scheduled for the future", async () => {
      const { org, list } = await seedOrg()
      await createSubscriber({ organizationId: org.id, listIds: [list.id] })
      const campaign = await createCampaign({
        organizationId: org.id,
        status: "SCHEDULED",
        listIds: [list.id],
        scheduledAt: addDays(new Date(), 1),
      })

      await processQueuedCampaigns()

      expect(await messagesFor(campaign.id)).toHaveLength(0)
    })

    // Nothing in the codebase moves SCHEDULED -> CREATING, so a campaign whose
    // scheduled time has passed is never picked up. See CONCERNS.md.
    it("also ignores a campaign whose scheduled time has passed", async () => {
      const { org, list } = await seedOrg()
      await createSubscriber({ organizationId: org.id, listIds: [list.id] })
      const campaign = await createCampaign({
        organizationId: org.id,
        status: "SCHEDULED",
        listIds: [list.id],
        scheduledAt: subDays(new Date(), 1),
      })

      await processQueuedCampaigns()

      expect(await messagesFor(campaign.id)).toHaveLength(0)
      const stored = await prisma.campaign.findUniqueOrThrow({
        where: { id: campaign.id },
      })
      expect(stored.status).toBe("SCHEDULED")
    })
  })
})
