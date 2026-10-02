import { faker } from "@faker-js/faker"
import {
  createCampaign,
  createList,
  createMessage,
  createSubscriber,
  createUser,
} from "@helpers/factories"
import { createCaller, expectTrpcError } from "@helpers/trpc"
import { prisma } from "@src/utils/prisma"
import { subDays } from "date-fns"
import { describe, expect, it } from "vitest"

const now = () => new Date()
const thisMonth = () => subDays(now(), 15)
const lastMonth = () => subDays(now(), 45)
const beforeWindow = () => subDays(now(), 200)

const getStats = (userId: string, organizationId: string) =>
  createCaller({ id: userId }).stats.getStats({ organizationId })

const seed = async () => {
  const { user, orgId } = await createUser()
  const campaign = await createCampaign({ organizationId: orgId })
  const subscriber = await createSubscriber({ organizationId: orgId })

  return { user, orgId, campaign, subscriber }
}

describe("trpc stats router", () => {
  describe("empty organization", () => {
    it("returns zeroed stats without dividing by zero", async () => {
      const { user, orgId } = await createUser()

      const stats = await getStats(user.id, orgId)

      expect(stats.messages).toEqual({
        total: 0,
        last30Days: 0,
        lastPeriod: 0,
      })
      expect(stats.openRate).toEqual({
        thisMonth: 0,
        lastMonth: 0,
        comparison: 0,
      })
      expect(stats.clickRate.thisMonth).toEqual({ clicked: 0, rate: 0 })
      expect(stats.deliveryRate.thisMonth).toEqual({ delivered: 0, rate: 0 })
      expect(stats.recipients).toEqual({
        allTime: 0,
        thisMonth: 0,
        lastMonth: 0,
        comparison: 0,
      })
      expect(stats.subscribers).toEqual({ allTime: 0, newThisMonth: 0 })
      expect(stats.unsubscribed).toEqual({
        thisMonth: 0,
        lastMonth: 0,
        comparison: 0,
      })
      expect(stats.campaigns).toEqual({
        total: 0,
        thisMonth: 0,
        lastMonth: 0,
        comparison: 0,
      })
      expect(stats.completedCampaigns).toEqual({
        total: 0,
        thisMonth: 0,
        lastMonth: 0,
        comparison: 0,
      })

      for (const value of Object.values(stats.openRate)) {
        expect(Number.isFinite(value)).toBe(true)
      }
    })
  })

  describe("messages", () => {
    it("counts only processed messages, split by window", async () => {
      const { user, orgId, campaign, subscriber } = await seed()

      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "SENT",
        createdAt: thisMonth(),
        sentAt: thisMonth(),
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "FAILED",
        createdAt: lastMonth(),
        sentAt: lastMonth(),
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "SENT",
        createdAt: beforeWindow(),
        sentAt: beforeWindow(),
      })
      // Not a processed status: excluded everywhere.
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
        createdAt: thisMonth(),
      })

      const stats = await getStats(user.id, orgId)

      expect(stats.messages).toEqual({
        total: 3,
        last30Days: 1,
        lastPeriod: 1,
      })
    })

    it("windows messages by sentAt, not createdAt", async () => {
      const { user, orgId, campaign, subscriber } = await seed()

      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "OPENED",
        createdAt: lastMonth(),
        sentAt: thisMonth(),
      })

      const stats = await getStats(user.id, orgId)

      expect(stats.messages).toEqual({
        total: 1,
        last30Days: 1,
        lastPeriod: 0,
      })
      expect(stats.openRate.thisMonth).toBe(100)
      expect(stats.openRate.lastMonth).toBe(0)
      expect(stats.deliveryRate.thisMonth).toEqual({
        delivered: 1,
        rate: 100,
      })
    })

    it("excludes another organization's messages", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const campaign = await createCampaign({ organizationId: otherOrgId })
      const subscriber = await createSubscriber({ organizationId: otherOrgId })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "SENT",
      })

      const stats = await getStats(user.id, orgId)

      expect(stats.messages.total).toBe(0)
    })
  })

  describe("openRate", () => {
    it("is opened messages over the processed messages of the window", async () => {
      const { user, orgId, campaign, subscriber } = await seed()

      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "OPENED",
        createdAt: thisMonth(),
        sentAt: thisMonth(),
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "CLICKED",
        createdAt: thisMonth(),
        sentAt: thisMonth(),
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "SENT",
        createdAt: thisMonth(),
        sentAt: thisMonth(),
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "FAILED",
        createdAt: thisMonth(),
        sentAt: thisMonth(),
      })

      const stats = await getStats(user.id, orgId)

      expect(stats.openRate.thisMonth).toBe(50)
      expect(stats.openRate.lastMonth).toBe(0)
      expect(stats.openRate.comparison).toBe(50)
    })

    it("compares against the previous period", async () => {
      const { user, orgId, campaign, subscriber } = await seed()

      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "OPENED",
        createdAt: lastMonth(),
        sentAt: lastMonth(),
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "SENT",
        createdAt: lastMonth(),
        sentAt: lastMonth(),
      })

      const stats = await getStats(user.id, orgId)

      expect(stats.openRate.lastMonth).toBe(50)
      expect(stats.openRate.comparison).toBe(-50)
    })

    it("ignores messages that were never sent", async () => {
      const { user, orgId, campaign, subscriber } = await seed()

      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "OPENED",
        createdAt: thisMonth(),
      })

      const stats = await getStats(user.id, orgId)

      expect(stats.openRate.thisMonth).toBe(0)
    })
  })

  describe("deliveryRate", () => {
    it("counts SENT, OPENED and CLICKED as delivered", async () => {
      const { user, orgId, campaign, subscriber } = await seed()

      for (const status of ["SENT", "OPENED", "CLICKED", "FAILED"] as const) {
        await createMessage({
          campaignId: campaign.id,
          subscriberId: subscriber.id,
          status,
          createdAt: thisMonth(),
          sentAt: thisMonth(),
        })
      }

      const stats = await getStats(user.id, orgId)

      expect(stats.deliveryRate.thisMonth).toEqual({ delivered: 3, rate: 75 })
      expect(stats.deliveryRate.comparison).toBe(75)
    })
  })

  describe("clickRate", () => {
    it("counts only CLICKED messages", async () => {
      const { user, orgId, campaign, subscriber } = await seed()

      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "CLICKED",
        createdAt: thisMonth(),
        sentAt: thisMonth(),
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "OPENED",
        createdAt: thisMonth(),
        sentAt: thisMonth(),
      })

      const stats = await getStats(user.id, orgId)

      expect(stats.clickRate.thisMonth).toEqual({ clicked: 1, rate: 50 })
      expect(stats.clickRate.lastMonth).toEqual({ clicked: 0, rate: 0 })
    })
  })

  describe("subscribers", () => {
    it("counts all subscribers and the ones added in the last 30 days", async () => {
      const { user, orgId } = await createUser()

      await createSubscriber({ organizationId: orgId, createdAt: thisMonth() })
      await createSubscriber({ organizationId: orgId, createdAt: lastMonth() })
      await createSubscriber({
        organizationId: orgId,
        createdAt: beforeWindow(),
      })

      const stats = await getStats(user.id, orgId)

      expect(stats.subscribers).toEqual({ allTime: 3, newThisMonth: 1 })
    })

    it("excludes another organization's subscribers", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      await createSubscriber({ organizationId: otherOrgId })

      const stats = await getStats(user.id, orgId)

      expect(stats.subscribers.allTime).toBe(0)
    })
  })

  describe("unsubscribed", () => {
    it("counts unsubscribes per window", async () => {
      const { user, orgId } = await createUser()
      const list = await createList({ organizationId: orgId })

      const unsubscribeAt = async (unsubscribedAt: Date) => {
        const subscriber = await createSubscriber({
          organizationId: orgId,
          listIds: [list.id],
        })
        await prisma.listSubscriber.updateMany({
          where: { listId: list.id, subscriberId: subscriber.id },
          data: { unsubscribedAt },
        })
      }

      await unsubscribeAt(thisMonth())
      await unsubscribeAt(lastMonth())
      await unsubscribeAt(lastMonth())
      await createSubscriber({ organizationId: orgId, listIds: [list.id] })

      const stats = await getStats(user.id, orgId)

      expect(stats.unsubscribed).toEqual({
        thisMonth: 1,
        lastMonth: 2,
        comparison: -1,
      })
    })

    it("excludes another organization's lists", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const list = await createList({ organizationId: otherOrgId })
      const subscriber = await createSubscriber({
        organizationId: otherOrgId,
        listIds: [list.id],
      })
      await prisma.listSubscriber.updateMany({
        where: { listId: list.id, subscriberId: subscriber.id },
        data: { unsubscribedAt: thisMonth() },
      })

      const stats = await getStats(user.id, orgId)

      expect(stats.unsubscribed.thisMonth).toBe(0)
    })
  })

  describe("campaigns", () => {
    it("counts campaigns per window", async () => {
      const { user, orgId } = await createUser()

      await createCampaign({ organizationId: orgId, createdAt: thisMonth() })
      await createCampaign({ organizationId: orgId, createdAt: lastMonth() })
      await createCampaign({
        organizationId: orgId,
        createdAt: beforeWindow(),
      })

      const stats = await getStats(user.id, orgId)

      expect(stats.campaigns).toMatchObject({
        total: 3,
        thisMonth: 1,
        lastMonth: 1,
      })
    })

    it("counts completed campaigns separately", async () => {
      const { user, orgId } = await createUser()

      await createCampaign({
        organizationId: orgId,
        status: "COMPLETED",
        createdAt: thisMonth(),
      })
      await createCampaign({
        organizationId: orgId,
        status: "COMPLETED",
        createdAt: lastMonth(),
      })
      await createCampaign({ organizationId: orgId, createdAt: thisMonth() })

      const stats = await getStats(user.id, orgId)

      expect(stats.completedCampaigns).toMatchObject({
        total: 2,
        thisMonth: 1,
        lastMonth: 1,
      })
      expect(stats.campaigns.total).toBe(3)
    })

    it("compares this month against last month", async () => {
      const { user, orgId } = await createUser()

      await createCampaign({ organizationId: orgId, createdAt: thisMonth() })
      await createCampaign({ organizationId: orgId, createdAt: lastMonth() })
      await createCampaign({ organizationId: orgId, createdAt: lastMonth() })
      await createCampaign({
        organizationId: orgId,
        createdAt: beforeWindow(),
      })

      const stats = await getStats(user.id, orgId)

      expect(stats.campaigns).toEqual({
        total: 4,
        thisMonth: 1,
        lastMonth: 2,
        comparison: -1,
      })
    })

    it("compares completed campaigns this month against last month", async () => {
      const { user, orgId } = await createUser()

      await createCampaign({
        organizationId: orgId,
        status: "COMPLETED",
        createdAt: thisMonth(),
      })
      await createCampaign({
        organizationId: orgId,
        status: "COMPLETED",
        createdAt: thisMonth(),
      })
      await createCampaign({
        organizationId: orgId,
        status: "COMPLETED",
        createdAt: beforeWindow(),
      })

      const stats = await getStats(user.id, orgId)

      expect(stats.completedCampaigns).toEqual({
        total: 3,
        thisMonth: 2,
        lastMonth: 0,
        comparison: 2,
      })
    })

    it("excludes another organization's campaigns", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      await createCampaign({ organizationId: otherOrgId })

      const stats = await getStats(user.id, orgId)

      expect(stats.campaigns.total).toBe(0)
    })
  })

  describe("recipients", () => {
    it("counts distinct message recipients per window", async () => {
      const { user, orgId, campaign } = await seed()
      const first = await createSubscriber({ organizationId: orgId })
      const second = await createSubscriber({ organizationId: orgId })

      await createMessage({
        campaignId: campaign.id,
        subscriberId: first.id,
        status: "SENT",
        createdAt: thisMonth(),
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: first.id,
        status: "SENT",
        createdAt: thisMonth(),
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: second.id,
        status: "SENT",
        createdAt: lastMonth(),
      })

      const stats = await getStats(user.id, orgId)

      expect(stats.recipients).toEqual({
        allTime: 2,
        thisMonth: 1,
        lastMonth: 1,
        comparison: 0,
      })
    })

    it.each(["QUEUED", "CANCELLED"] as const)(
      "does not count a recipient whose only message is %s",
      async (status) => {
        const { user, orgId, campaign, subscriber } = await seed()

        await createMessage({
          campaignId: campaign.id,
          subscriberId: subscriber.id,
          status,
          createdAt: thisMonth(),
        })

        const stats = await getStats(user.id, orgId)

        expect(stats.recipients.allTime).toBe(0)
        expect(stats.recipients.thisMonth).toBe(0)
      }
    )

    it("excludes another organization's recipients", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const campaign = await createCampaign({ organizationId: otherOrgId })
      const subscriber = await createSubscriber({ organizationId: otherOrgId })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "SENT",
      })

      const stats = await getStats(user.id, orgId)

      expect(stats.recipients.allTime).toBe(0)
    })
  })

  describe("authorization", () => {
    it("rejects an organization the caller is not a member of", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()

      await expectTrpcError(getStats(user.id, otherOrgId), "UNAUTHORIZED")
    })

    it("rejects an unknown organization id", async () => {
      const { user } = await createUser()

      await expectTrpcError(
        getStats(user.id, faker.string.uuid()),
        "UNAUTHORIZED"
      )
    })

    it("requires authentication", async () => {
      await expectTrpcError(
        createCaller().stats.getStats({ organizationId: "org" }),
        "UNAUTHORIZED"
      )
    })
  })
})
