import { faker } from "@faker-js/faker"
import {
  createCampaign,
  createList,
  createMessage,
  createSubscriber,
  createTemplate,
  createUser,
} from "@helpers/factories"
import { createCaller, expectTrpcError } from "@helpers/trpc"
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
    accepted: ["to@example.com"],
    rejected: [],
    messageId: "<sent-id@test>",
  })
})

/** A campaign that satisfies every precondition of `start`. */
const seedSendableCampaign = async () => {
  const { user, orgId } = await createUser()
  await prisma.generalSettings.updateMany({
    where: { organizationId: orgId },
    data: { baseURL: "https://example.com" },
  })

  const list = await createList({ organizationId: orgId })
  await createSubscriber({ organizationId: orgId, listIds: [list.id] })
  const campaign = await createCampaign({
    organizationId: orgId,
    listIds: [list.id],
    subject: "Hello",
    content: "<p>Body</p>",
    status: "DRAFT",
  })

  return { user, orgId, list, campaign }
}

describe("trpc campaign router", () => {
  describe("create", () => {
    it("creates a DRAFT campaign", async () => {
      const { user, orgId } = await createUser()

      const { campaign } = await createCaller({ id: user.id }).campaign.create({
        title: "Spring Launch",
        description: "The big one",
        organizationId: orgId,
      })

      expect(campaign).toMatchObject({
        title: "Spring Launch",
        description: "The big one",
        status: "DRAFT",
        organizationId: orgId,
      })
      expect(campaign.CampaignLists).toEqual([])

      const stored = await prisma.campaign.findUnique({
        where: { id: campaign.id },
      })
      expect(stored?.status).toBe("DRAFT")
    })

    it("allows an omitted description", async () => {
      const { user, orgId } = await createUser()

      const { campaign } = await createCaller({ id: user.id }).campaign.create({
        title: "No Description",
        organizationId: orgId,
      })

      expect(campaign.description).toBeNull()
    })

    it("rejects an empty title", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.create({
          title: "",
          organizationId: orgId,
        }),
        "BAD_REQUEST"
      )
    })

    it("rejects an organization the caller is not a member of", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.create({
          title: "Intruder",
          organizationId: otherOrgId,
        }),
        "UNAUTHORIZED"
      )

      const campaigns = await prisma.campaign.findMany({
        where: { organizationId: otherOrgId },
      })
      expect(campaigns).toHaveLength(0)
    })
  })

  describe("list", () => {
    it("returns campaigns with pagination metadata and counts", async () => {
      const { user, orgId } = await createUser()
      const list = await createList({ organizationId: orgId })
      const template = await createTemplate({ organizationId: orgId })
      const subscriber = await createSubscriber({ organizationId: orgId })
      const campaign = await createCampaign({
        organizationId: orgId,
        listIds: [list.id],
        templateId: template.id,
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
      })

      const result = await createCaller({ id: user.id }).campaign.list({
        organizationId: orgId,
      })

      expect(result.pagination).toEqual({
        total: 1,
        totalPages: 1,
        page: 1,
        perPage: 10,
        hasMore: false,
      })
      expect(result.campaigns[0]?._count.Messages).toBe(1)
      expect(result.campaigns[0]?.Template).toEqual({
        id: template.id,
        name: template.name,
      })
      expect(result.campaigns[0]?.CampaignLists[0]?.List).toEqual({
        id: list.id,
        name: list.name,
      })
    })

    it("paginates without overlap, newest first", async () => {
      const { user, orgId } = await createUser()
      const created = []
      for (let i = 0; i < 5; i++) {
        created.push(await createCampaign({ organizationId: orgId }))
      }

      const caller = createCaller({ id: user.id })
      const first = await caller.campaign.list({
        organizationId: orgId,
        page: 1,
        perPage: 2,
      })
      const second = await caller.campaign.list({
        organizationId: orgId,
        page: 2,
        perPage: 2,
      })
      const third = await caller.campaign.list({
        organizationId: orgId,
        page: 3,
        perPage: 2,
      })

      expect(first.pagination).toMatchObject({
        total: 5,
        totalPages: 3,
        hasMore: true,
      })
      expect(third.pagination.hasMore).toBe(false)

      const ids = [
        ...first.campaigns,
        ...second.campaigns,
        ...third.campaigns,
      ].map((c) => c.id)
      expect(new Set(ids).size).toBe(5)
      expect(ids[0]).toBe(created[4]?.id)
    })

    it("searches title, description and subject case-insensitively", async () => {
      const { user, orgId } = await createUser()
      const byTitle = await createCampaign({
        organizationId: orgId,
        title: "Rocket launch",
      })
      const bySubject = await createCampaign({
        organizationId: orgId,
        title: "Other",
        subject: "We ROCKET onwards",
      })
      const byDescription = await prisma.campaign.create({
        data: {
          title: "Third",
          subject: "Nothing",
          description: "about rockets",
          organizationId: orgId,
        },
      })
      await createCampaign({
        organizationId: orgId,
        title: "Unrelated",
        subject: "Unrelated",
      })

      const result = await createCaller({ id: user.id }).campaign.list({
        organizationId: orgId,
        search: "rocket",
      })

      expect(result.campaigns.map((c) => c.id).sort()).toEqual(
        [byTitle.id, bySubject.id, byDescription.id].sort()
      )
    })

    it("excludes campaigns from other organizations", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      await createCampaign({ organizationId: orgId })
      await createCampaign({ organizationId: otherOrgId })

      const result = await createCaller({ id: user.id }).campaign.list({
        organizationId: orgId,
      })

      expect(result.pagination.total).toBe(1)
    })

    it("rejects perPage above 100", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.list({
          organizationId: orgId,
          perPage: 101,
        }),
        "BAD_REQUEST"
      )
    })

    it("rejects an organization the caller is not a member of", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.list({
          organizationId: otherOrgId,
        }),
        "UNAUTHORIZED"
      )
    })
  })

  describe("get", () => {
    it("returns the campaign with recipient counts and stats", async () => {
      const { user, orgId } = await createUser()
      const list = await createList({ organizationId: orgId })
      const a = await createSubscriber({
        organizationId: orgId,
        listIds: [list.id],
      })
      const b = await createSubscriber({
        organizationId: orgId,
        listIds: [list.id],
      })
      const campaign = await createCampaign({
        organizationId: orgId,
        listIds: [list.id],
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: a.id,
        status: "OPENED",
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: b.id,
        status: "CLICKED",
      })

      const result = await createCaller({ id: user.id }).campaign.get({
        id: campaign.id,
        organizationId: orgId,
      })

      expect(result.campaign.uniqueRecipientCount).toBe(2)
      expect(
        result.campaign.CampaignLists[0]?.List._count.ListSubscribers
      ).toBe(2)
      expect(result.stats).toMatchObject({
        totalMessages: 2,
        sentMessages: 2,
        clicked: 1,
        opened: 2,
        failedMessages: 0,
      })
      expect(result.stats.openRate).toBe(100)
      expect(result.stats.clickRate).toBe(50)
    })

    it("counts a subscriber on two lists once", async () => {
      const { user, orgId } = await createUser()
      const listA = await createList({ organizationId: orgId })
      const listB = await createList({ organizationId: orgId })
      await createSubscriber({
        organizationId: orgId,
        listIds: [listA.id, listB.id],
      })
      const campaign = await createCampaign({
        organizationId: orgId,
        listIds: [listA.id, listB.id],
      })

      const result = await createCaller({ id: user.id }).campaign.get({
        id: campaign.id,
        organizationId: orgId,
      })

      expect(result.campaign.uniqueRecipientCount).toBe(1)
    })

    it("excludes unsubscribed members from the recipient count", async () => {
      const { user, orgId } = await createUser()
      const list = await createList({ organizationId: orgId })
      const subscriber = await createSubscriber({
        organizationId: orgId,
        listIds: [list.id],
      })
      await createSubscriber({ organizationId: orgId, listIds: [list.id] })
      await prisma.listSubscriber.updateMany({
        where: { listId: list.id, subscriberId: subscriber.id },
        data: { unsubscribedAt: new Date() },
      })
      const campaign = await createCampaign({
        organizationId: orgId,
        listIds: [list.id],
      })

      const result = await createCaller({ id: user.id }).campaign.get({
        id: campaign.id,
        organizationId: orgId,
      })

      expect(result.campaign.uniqueRecipientCount).toBe(1)
    })

    it("returns zero rates with no sent messages", async () => {
      const { user, orgId } = await createUser()
      const campaign = await createCampaign({ organizationId: orgId })

      const result = await createCaller({ id: user.id }).campaign.get({
        id: campaign.id,
        organizationId: orgId,
      })

      expect(result.stats).toMatchObject({
        totalMessages: 0,
        openRate: 0,
        clickRate: 0,
      })
    })

    it("throws NOT_FOUND for an unknown id", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.get({
          id: faker.string.uuid(),
          organizationId: orgId,
        }),
        "NOT_FOUND"
      )
    })

    it("does not return a campaign from another organization", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const campaign = await createCampaign({ organizationId: otherOrgId })

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.get({
          id: campaign.id,
          organizationId: otherOrgId,
        }),
        "UNAUTHORIZED"
      )

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.get({
          id: campaign.id,
          organizationId: orgId,
        }),
        "NOT_FOUND"
      )
    })
  })

  describe("update", () => {
    it("updates fields and replaces the campaign lists", async () => {
      const { user, orgId } = await createUser()
      const listA = await createList({ organizationId: orgId })
      const listB = await createList({ organizationId: orgId })
      const template = await createTemplate({ organizationId: orgId })
      const campaign = await createCampaign({
        organizationId: orgId,
        listIds: [listA.id],
        status: "DRAFT",
      })

      const { campaign: updated } = await createCaller({
        id: user.id,
      }).campaign.update({
        id: campaign.id,
        organizationId: orgId,
        title: "Renamed",
        subject: "New subject",
        content: "<p>New content</p>",
        templateId: template.id,
        listIds: [listB.id],
        openTracking: false,
      })

      expect(updated).toMatchObject({
        title: "Renamed",
        subject: "New subject",
        content: "<p>New content</p>",
        templateId: template.id,
        openTracking: false,
      })
      expect(updated.CampaignLists.map((cl) => cl.listId)).toEqual([listB.id])
    })

    it("clears the lists when an empty array is given", async () => {
      const { user, orgId } = await createUser()
      const list = await createList({ organizationId: orgId })
      const campaign = await createCampaign({
        organizationId: orgId,
        listIds: [list.id],
        status: "DRAFT",
      })

      const { campaign: updated } = await createCaller({
        id: user.id,
      }).campaign.update({
        id: campaign.id,
        organizationId: orgId,
        listIds: [],
      })

      expect(updated.CampaignLists).toEqual([])
    })

    it("keeps the lists when listIds is omitted", async () => {
      const { user, orgId } = await createUser()
      const list = await createList({ organizationId: orgId })
      const campaign = await createCampaign({
        organizationId: orgId,
        listIds: [list.id],
        status: "DRAFT",
      })

      const { campaign: updated } = await createCaller({
        id: user.id,
      }).campaign.update({
        id: campaign.id,
        organizationId: orgId,
        title: "Renamed",
      })

      expect(updated.title).toBe("Renamed")
      expect(updated.CampaignLists.map((cl) => cl.listId)).toEqual([list.id])
    })

    it("accepts a scheduledAt date", async () => {
      const { user, orgId } = await createUser()
      const campaign = await createCampaign({
        organizationId: orgId,
        status: "DRAFT",
      })
      const scheduledAt = new Date(Date.now() + 60 * 60 * 1000)

      const { campaign: updated } = await createCaller({
        id: user.id,
      }).campaign.update({
        id: campaign.id,
        organizationId: orgId,
        scheduledAt,
      })

      expect(updated.scheduledAt?.getTime()).toBe(scheduledAt.getTime())
    })

    it("rejects a template from another organization", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const template = await createTemplate({ organizationId: otherOrgId })
      const campaign = await createCampaign({
        organizationId: orgId,
        status: "DRAFT",
      })

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.update({
          id: campaign.id,
          organizationId: orgId,
          templateId: template.id,
        }),
        "NOT_FOUND"
      )
    })

    it("rejects a list from another organization", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const list = await createList({ organizationId: otherOrgId })
      const campaign = await createCampaign({
        organizationId: orgId,
        status: "DRAFT",
      })

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.update({
          id: campaign.id,
          organizationId: orgId,
          listIds: [list.id],
        }),
        "NOT_FOUND"
      )
    })

    it.each([
      "SCHEDULED",
      "CREATING",
      "SENDING",
      "COMPLETED",
      "CANCELLED",
    ] as const)("refuses to update a %s campaign", async (status) => {
      const { user, orgId } = await createUser()
      const campaign = await createCampaign({
        organizationId: orgId,
        title: "Original",
        status,
      })

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.update({
          id: campaign.id,
          organizationId: orgId,
          title: "Changed",
        }),
        "BAD_REQUEST"
      )

      const stored = await prisma.campaign.findUnique({
        where: { id: campaign.id },
      })
      expect(stored?.title).toBe("Original")
    })

    it("throws NOT_FOUND for an unknown id", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.update({
          id: faker.string.uuid(),
          organizationId: orgId,
          title: "Ghost",
        }),
        "NOT_FOUND"
      )
    })

    it("leaves another organization's campaign untouched", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const campaign = await createCampaign({
        organizationId: otherOrgId,
        title: "Theirs",
        status: "DRAFT",
      })

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.update({
          id: campaign.id,
          organizationId: otherOrgId,
          title: "Hijacked",
        }),
        "UNAUTHORIZED"
      )

      const stored = await prisma.campaign.findUnique({
        where: { id: campaign.id },
      })
      expect(stored?.title).toBe("Theirs")
    })
  })

  describe("delete", () => {
    it("deletes the campaign and its messages", async () => {
      const { user, orgId } = await createUser()
      const subscriber = await createSubscriber({ organizationId: orgId })
      const campaign = await createCampaign({ organizationId: orgId })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
      })

      const result = await createCaller({ id: user.id }).campaign.delete({
        id: campaign.id,
        organizationId: orgId,
      })

      expect(result).toEqual({ success: true })
      expect(
        await prisma.campaign.findUnique({ where: { id: campaign.id } })
      ).toBeNull()
      expect(
        await prisma.message.count({ where: { campaignId: campaign.id } })
      ).toBe(0)
      expect(
        await prisma.subscriber.findUnique({ where: { id: subscriber.id } })
      ).not.toBeNull()
    })

    it("throws NOT_FOUND for an unknown id", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.delete({
          id: faker.string.uuid(),
          organizationId: orgId,
        }),
        "NOT_FOUND"
      )
    })

    it("leaves another organization's campaign in place", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const campaign = await createCampaign({ organizationId: otherOrgId })

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.delete({
          id: campaign.id,
          organizationId: otherOrgId,
        }),
        "UNAUTHORIZED"
      )

      expect(
        await prisma.campaign.findUnique({ where: { id: campaign.id } })
      ).not.toBeNull()
    })
  })

  describe("start", () => {
    it("moves an unscheduled DRAFT campaign to CREATING", async () => {
      const { user, orgId, campaign } = await seedSendableCampaign()

      const result = await createCaller({ id: user.id }).campaign.start({
        id: campaign.id,
        organizationId: orgId,
      })

      expect(result.campaign.status).toBe("CREATING")
    })

    it("moves a future-scheduled campaign to SCHEDULED", async () => {
      const { user, orgId, campaign } = await seedSendableCampaign()
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { scheduledAt: new Date(Date.now() + 60 * 60 * 1000) },
      })

      const result = await createCaller({ id: user.id }).campaign.start({
        id: campaign.id,
        organizationId: orgId,
      })

      expect(result.campaign.status).toBe("SCHEDULED")
    })

    it("starts a past-scheduled campaign immediately", async () => {
      const { user, orgId, campaign } = await seedSendableCampaign()
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { scheduledAt: new Date(Date.now() - 60 * 1000) },
      })

      const result = await createCaller({ id: user.id }).campaign.start({
        id: campaign.id,
        organizationId: orgId,
      })

      expect(result.campaign.status).toBe("CREATING")
    })

    it.each([
      "SCHEDULED",
      "CREATING",
      "SENDING",
      "COMPLETED",
      "CANCELLED",
    ] as const)("refuses to start a %s campaign", async (status) => {
      const { user, orgId, campaign } = await seedSendableCampaign()
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status },
      })

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.start({
          id: campaign.id,
          organizationId: orgId,
        }),
        "BAD_REQUEST"
      )

      const stored = await prisma.campaign.findUnique({
        where: { id: campaign.id },
      })
      expect(stored?.status).toBe(status)
    })

    it("requires a subject", async () => {
      const { user, orgId, campaign } = await seedSendableCampaign()
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { subject: null },
      })

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.start({
          id: campaign.id,
          organizationId: orgId,
        }),
        "BAD_REQUEST"
      )
    })

    it("requires content", async () => {
      const { user, orgId, campaign } = await seedSendableCampaign()
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { content: null },
      })

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.start({
          id: campaign.id,
          organizationId: orgId,
        }),
        "BAD_REQUEST"
      )
    })

    it("requires at least one list", async () => {
      const { user, orgId, campaign } = await seedSendableCampaign()
      await prisma.campaignList.deleteMany({
        where: { campaignId: campaign.id },
      })

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.start({
          id: campaign.id,
          organizationId: orgId,
        }),
        "BAD_REQUEST"
      )
    })

    it("requires at least one subscribed recipient", async () => {
      const { user, orgId, list, campaign } = await seedSendableCampaign()
      await prisma.listSubscriber.updateMany({
        where: { listId: list.id },
        data: { unsubscribedAt: new Date() },
      })

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.start({
          id: campaign.id,
          organizationId: orgId,
        }),
        "BAD_REQUEST"
      )
    })

    it("requires a configured base URL", async () => {
      const { user, orgId, campaign } = await seedSendableCampaign()
      await prisma.generalSettings.updateMany({
        where: { organizationId: orgId },
        data: { baseURL: null },
      })

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.start({
          id: campaign.id,
          organizationId: orgId,
        }),
        "BAD_REQUEST"
      )

      const stored = await prisma.campaign.findUnique({
        where: { id: campaign.id },
      })
      expect(stored?.status).toBe("DRAFT")
    })

    it("requires SMTP settings", async () => {
      const { user, orgId, campaign } = await seedSendableCampaign()
      await prisma.smtpSettings.deleteMany({ where: { organizationId: orgId } })

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.start({
          id: campaign.id,
          organizationId: orgId,
        }),
        "BAD_REQUEST"
      )
    })

    it("requires email delivery settings", async () => {
      const { user, orgId, campaign } = await seedSendableCampaign()
      await prisma.emailDeliverySettings.deleteMany({
        where: { organizationId: orgId },
      })

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.start({
          id: campaign.id,
          organizationId: orgId,
        }),
        "BAD_REQUEST"
      )
    })

    it("throws NOT_FOUND for an unknown id", async () => {
      const { user, orgId } = await seedSendableCampaign()

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.start({
          id: faker.string.uuid(),
          organizationId: orgId,
        }),
        "NOT_FOUND"
      )
    })

    it("leaves another organization's campaign in DRAFT", async () => {
      const { user } = await createUser()
      const other = await seedSendableCampaign()

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.start({
          id: other.campaign.id,
          organizationId: other.orgId,
        }),
        "UNAUTHORIZED"
      )

      const stored = await prisma.campaign.findUnique({
        where: { id: other.campaign.id },
      })
      expect(stored?.status).toBe("DRAFT")
    })
  })

  describe("cancel", () => {
    it.each(["CREATING", "SENDING", "SCHEDULED"] as const)(
      "cancels a %s campaign",
      async (status) => {
        const { user, orgId } = await createUser()
        const campaign = await createCampaign({ organizationId: orgId, status })

        const result = await createCaller({ id: user.id }).campaign.cancel({
          id: campaign.id,
          organizationId: orgId,
        })

        expect(result).toEqual({ success: true })
        const stored = await prisma.campaign.findUnique({
          where: { id: campaign.id },
        })
        expect(stored?.status).toBe("CANCELLED")
      }
    )

    it("cancels in-flight messages but leaves settled ones", async () => {
      const { user, orgId } = await createUser()
      const subscriber = await createSubscriber({ organizationId: orgId })
      const campaign = await createCampaign({
        organizationId: orgId,
        status: "SENDING",
      })
      const queued = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
      })
      const pending = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "PENDING",
      })
      const retrying = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "RETRYING",
      })
      const sent = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "SENT",
      })

      await createCaller({ id: user.id }).campaign.cancel({
        id: campaign.id,
        organizationId: orgId,
      })

      const statuses = await prisma.message.findMany({
        where: { id: { in: [queued.id, pending.id, retrying.id, sent.id] } },
        select: { id: true, status: true },
      })
      const byId = Object.fromEntries(statuses.map((m) => [m.id, m.status]))

      expect(byId[queued.id]).toBe("CANCELLED")
      expect(byId[pending.id]).toBe("CANCELLED")
      expect(byId[retrying.id]).toBe("CANCELLED")
      expect(byId[sent.id]).toBe("SENT")
    })

    it.each(["DRAFT", "COMPLETED", "CANCELLED"] as const)(
      "refuses to cancel a %s campaign",
      async (status) => {
        const { user, orgId } = await createUser()
        const campaign = await createCampaign({ organizationId: orgId, status })

        await expectTrpcError(
          createCaller({ id: user.id }).campaign.cancel({
            id: campaign.id,
            organizationId: orgId,
          }),
          "BAD_REQUEST"
        )
      }
    )

    it("throws NOT_FOUND for an unknown id", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.cancel({
          id: faker.string.uuid(),
          organizationId: orgId,
        }),
        "NOT_FOUND"
      )
    })

    it("leaves another organization's campaign running", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const campaign = await createCampaign({
        organizationId: otherOrgId,
        status: "SENDING",
      })

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.cancel({
          id: campaign.id,
          organizationId: otherOrgId,
        }),
        "UNAUTHORIZED"
      )

      const stored = await prisma.campaign.findUnique({
        where: { id: campaign.id },
      })
      expect(stored?.status).toBe("SENDING")
    })
  })

  describe("duplicate", () => {
    it("copies content, template and lists into a new DRAFT", async () => {
      const { user, orgId } = await createUser()
      const list = await createList({ organizationId: orgId })
      const template = await createTemplate({ organizationId: orgId })
      const campaign = await createCampaign({
        organizationId: orgId,
        title: "Original",
        subject: "Subject",
        content: "<p>Body</p>",
        templateId: template.id,
        listIds: [list.id],
        status: "COMPLETED",
      })

      const { campaign: copy } = await createCaller({
        id: user.id,
      }).campaign.duplicate({ id: campaign.id, organizationId: orgId })

      expect(copy.id).not.toBe(campaign.id)
      expect(copy).toMatchObject({
        title: "Copy of Original",
        subject: "Subject",
        content: "<p>Body</p>",
        templateId: template.id,
        status: "DRAFT",
        organizationId: orgId,
      })
      expect(copy.CampaignLists.map((cl) => cl.listId)).toEqual([list.id])
    })

    it("does not copy messages", async () => {
      const { user, orgId } = await createUser()
      const subscriber = await createSubscriber({ organizationId: orgId })
      const campaign = await createCampaign({ organizationId: orgId })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
      })

      const { campaign: copy } = await createCaller({
        id: user.id,
      }).campaign.duplicate({ id: campaign.id, organizationId: orgId })

      expect(
        await prisma.message.count({ where: { campaignId: copy.id } })
      ).toBe(0)
    })

    it("throws NOT_FOUND for an unknown id", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.duplicate({
          id: faker.string.uuid(),
          organizationId: orgId,
        }),
        "NOT_FOUND"
      )
    })

    it("refuses to duplicate another organization's campaign", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const campaign = await createCampaign({ organizationId: otherOrgId })

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.duplicate({
          id: campaign.id,
          organizationId: otherOrgId,
        }),
        "UNAUTHORIZED"
      )

      expect(
        await prisma.campaign.count({ where: { organizationId: otherOrgId } })
      ).toBe(1)
    })
  })

  describe("sendTestEmail", () => {
    it("sends the campaign content with a [Test] subject", async () => {
      const { user, orgId } = await createUser()
      await prisma.smtpSettings.updateMany({
        where: { organizationId: orgId },
        data: { fromEmail: "hello@example.com", fromName: "LetterSpace" },
      })
      const campaign = await createCampaign({
        organizationId: orgId,
        subject: "Weekly Digest",
        content: "<p>Body</p>",
      })

      const result = await createCaller({ id: user.id }).campaign.sendTestEmail(
        {
          campaignId: campaign.id,
          organizationId: orgId,
          email: "tester@example.com",
        }
      )

      expect(result).toEqual({ success: true })
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["tester@example.com"],
          subject: "[Test] Weekly Digest",
          html: "<p>Body</p>",
          from: "LetterSpace <hello@example.com>",
        })
      )
    })

    it("renders the campaign content into the template", async () => {
      const { user, orgId } = await createUser()
      const template = await createTemplate({
        organizationId: orgId,
        content: "<html>{{content}}</html>",
      })
      const campaign = await createCampaign({
        organizationId: orgId,
        templateId: template.id,
        content: "<p>Body</p>",
      })

      await createCaller({ id: user.id }).campaign.sendTestEmail({
        campaignId: campaign.id,
        organizationId: orgId,
        email: "tester@example.com",
      })

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ html: "<html><p>Body</p></html>" })
      )
    })

    it("throws when the transport rejects the recipient", async () => {
      const { user, orgId } = await createUser()
      sendMail.mockResolvedValue({
        accepted: [],
        rejected: ["tester@example.com"],
        messageId: "<id@test>",
      })
      const campaign = await createCampaign({ organizationId: orgId })

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.sendTestEmail({
          campaignId: campaign.id,
          organizationId: orgId,
          email: "tester@example.com",
        }),
        "INTERNAL_SERVER_ERROR"
      )
    })

    it("rejects an invalid email address", async () => {
      const { user, orgId } = await createUser()
      const campaign = await createCampaign({ organizationId: orgId })

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.sendTestEmail({
          campaignId: campaign.id,
          organizationId: orgId,
          email: "not-an-email",
        }),
        "BAD_REQUEST"
      )
      expect(sendMail).not.toHaveBeenCalled()
    })

    it("requires SMTP settings", async () => {
      const { user, orgId } = await createUser()
      await prisma.smtpSettings.deleteMany({ where: { organizationId: orgId } })
      const campaign = await createCampaign({ organizationId: orgId })

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.sendTestEmail({
          campaignId: campaign.id,
          organizationId: orgId,
          email: "tester@example.com",
        }),
        "BAD_REQUEST"
      )
    })

    it("requires a subject", async () => {
      const { user, orgId } = await createUser()
      const campaign = await createCampaign({ organizationId: orgId })
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { subject: null },
      })

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.sendTestEmail({
          campaignId: campaign.id,
          organizationId: orgId,
          email: "tester@example.com",
        }),
        "BAD_REQUEST"
      )
      expect(sendMail).not.toHaveBeenCalled()
    })

    it("requires content", async () => {
      const { user, orgId } = await createUser()
      const campaign = await createCampaign({ organizationId: orgId })
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { content: null },
      })

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.sendTestEmail({
          campaignId: campaign.id,
          organizationId: orgId,
          email: "tester@example.com",
        }),
        "BAD_REQUEST"
      )
    })

    it("throws NOT_FOUND for an unknown campaign", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.sendTestEmail({
          campaignId: faker.string.uuid(),
          organizationId: orgId,
          email: "tester@example.com",
        }),
        "NOT_FOUND"
      )
    })

    it("refuses another organization's campaign", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const campaign = await createCampaign({ organizationId: otherOrgId })

      await expectTrpcError(
        createCaller({ id: user.id }).campaign.sendTestEmail({
          campaignId: campaign.id,
          organizationId: otherOrgId,
          email: "tester@example.com",
        }),
        "UNAUTHORIZED"
      )
      expect(sendMail).not.toHaveBeenCalled()
    })
  })

  describe("authentication", () => {
    it.each([
      [
        "create",
        () =>
          createCaller().campaign.create({
            title: "t",
            organizationId: "org",
          }),
      ],
      [
        "update",
        () =>
          createCaller().campaign.update({ id: "id", organizationId: "org" }),
      ],
      [
        "delete",
        () =>
          createCaller().campaign.delete({ id: "id", organizationId: "org" }),
      ],
      [
        "get",
        () => createCaller().campaign.get({ id: "id", organizationId: "org" }),
      ],
      ["list", () => createCaller().campaign.list({ organizationId: "org" })],
      [
        "start",
        () =>
          createCaller().campaign.start({ id: "id", organizationId: "org" }),
      ],
      [
        "cancel",
        () =>
          createCaller().campaign.cancel({ id: "id", organizationId: "org" }),
      ],
      [
        "duplicate",
        () =>
          createCaller().campaign.duplicate({
            id: "id",
            organizationId: "org",
          }),
      ],
      [
        "sendTestEmail",
        () =>
          createCaller().campaign.sendTestEmail({
            campaignId: "id",
            organizationId: "org",
            email: "a@example.com",
          }),
      ],
    ])("%s requires authentication", async (_name, call) => {
      await expectTrpcError(call(), "UNAUTHORIZED")
    })
  })
})
