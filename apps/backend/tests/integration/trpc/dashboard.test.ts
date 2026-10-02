import { faker } from "@faker-js/faker"
import {
  createCampaign,
  createMessage,
  createSubscriber,
  createUser,
} from "@helpers/factories"
import { createCaller, expectTrpcError } from "@helpers/trpc"
import { prisma } from "@src/utils/prisma"
import { subDays, subMonths, subYears } from "date-fns"
import { describe, expect, it } from "vitest"

const getStats = (userId: string, organizationId: string) =>
  createCaller({ id: userId }).dashboard.getStats({ organizationId })

describe("trpc dashboard router", () => {
  describe("messageStats", () => {
    it("groups message counts by status", async () => {
      const { user, orgId } = await createUser()
      const campaign = await createCampaign({ organizationId: orgId })
      const subscriber = await createSubscriber({ organizationId: orgId })

      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "SENT",
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "SENT",
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "FAILED",
      })

      const stats = await getStats(user.id, orgId)

      expect(stats.messageStats).toEqual({ SENT: 2, FAILED: 1 })
    })

    it("is an empty object when the organization has no messages", async () => {
      const { user, orgId } = await createUser()

      const stats = await getStats(user.id, orgId)

      expect(stats.messageStats).toEqual({})
    })

    it("excludes messages older than the six month window", async () => {
      const { user, orgId } = await createUser()
      const campaign = await createCampaign({ organizationId: orgId })
      const subscriber = await createSubscriber({ organizationId: orgId })

      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "SENT",
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "SENT",
        createdAt: subYears(new Date(), 1),
      })

      const stats = await getStats(user.id, orgId)

      expect(stats.messageStats).toEqual({ SENT: 1 })
    })

    it("excludes messages belonging to another organization", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const otherCampaign = await createCampaign({
        organizationId: otherOrgId,
      })
      const otherSubscriber = await createSubscriber({
        organizationId: otherOrgId,
      })
      await createMessage({
        campaignId: otherCampaign.id,
        subscriberId: otherSubscriber.id,
        status: "SENT",
      })

      const stats = await getStats(user.id, orgId)

      expect(stats.messageStats).toEqual({})
    })
  })

  describe("recentCampaigns", () => {
    it("returns only completed campaigns with their delivery rate", async () => {
      const { user, orgId } = await createUser()
      const completed = await createCampaign({
        organizationId: orgId,
        title: "Completed",
        status: "COMPLETED",
      })
      await createCampaign({ organizationId: orgId, title: "Draft" })
      const subscriber = await createSubscriber({ organizationId: orgId })

      await createMessage({
        campaignId: completed.id,
        subscriberId: subscriber.id,
        status: "OPENED",
      })
      await createMessage({
        campaignId: completed.id,
        subscriberId: subscriber.id,
        status: "SENT",
      })
      await createMessage({
        campaignId: completed.id,
        subscriberId: subscriber.id,
        status: "FAILED",
      })
      await createMessage({
        campaignId: completed.id,
        subscriberId: subscriber.id,
        status: "CANCELLED",
      })

      const stats = await getStats(user.id, orgId)

      expect(stats.recentCampaigns).toHaveLength(1)
      expect(stats.recentCampaigns[0]).toMatchObject({
        id: completed.id,
        title: "Completed",
        status: "COMPLETED",
        totalMessages: 4,
        sentMessages: 2,
        deliveryRate: 50,
      })
    })

    it("reports a zero delivery rate for a completed campaign with no messages", async () => {
      const { user, orgId } = await createUser()
      await createCampaign({ organizationId: orgId, status: "COMPLETED" })

      const stats = await getStats(user.id, orgId)

      expect(stats.recentCampaigns[0]).toMatchObject({
        deliveryRate: 0,
        totalMessages: 0,
        sentMessages: 0,
      })
    })

    it("returns the five newest completed campaigns", async () => {
      const { user, orgId } = await createUser()
      const now = new Date()

      for (let i = 0; i < 7; i++) {
        await createCampaign({
          organizationId: orgId,
          title: `Campaign ${i}`,
          status: "COMPLETED",
          createdAt: subDays(now, i),
        })
      }

      const stats = await getStats(user.id, orgId)

      expect(stats.recentCampaigns.map((c) => c.title)).toEqual([
        "Campaign 0",
        "Campaign 1",
        "Campaign 2",
        "Campaign 3",
        "Campaign 4",
      ])
    })

    it("excludes completed campaigns from another organization", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      await createCampaign({
        organizationId: otherOrgId,
        status: "COMPLETED",
      })

      const stats = await getStats(user.id, orgId)

      expect(stats.recentCampaigns).toEqual([])
    })

    it("exposes completedAt", async () => {
      const { user, orgId } = await createUser()
      const completedAt = subDays(new Date(), 3)
      await createCampaign({
        organizationId: orgId,
        status: "COMPLETED",
        completedAt,
      })

      const stats = await getStats(user.id, orgId)

      expect(stats.recentCampaigns[0]?.completedAt).toEqual(completedAt)
    })
  })

  describe("subscriberGrowth", () => {
    it("is empty when the organization has no subscribers", async () => {
      const { user, orgId } = await createUser()

      const stats = await getStats(user.id, orgId)

      expect(stats.subscriberGrowth).toEqual([])
    })

    it("accumulates the per-day counts", async () => {
      const { user, orgId } = await createUser()
      const now = new Date()

      await createSubscriber({
        organizationId: orgId,
        createdAt: subDays(now, 3),
      })
      await createSubscriber({
        organizationId: orgId,
        createdAt: subDays(now, 2),
      })
      await createSubscriber({
        organizationId: orgId,
        createdAt: subDays(now, 2),
      })

      const stats = await getStats(user.id, orgId)

      expect(stats.subscriberGrowth.map((p) => p.count)).toEqual([1, 3])
    })

    it("starts from the count of subscribers older than the window", async () => {
      const { user, orgId } = await createUser()

      await createSubscriber({
        organizationId: orgId,
        createdAt: subYears(new Date(), 1),
      })
      await createSubscriber({
        organizationId: orgId,
        createdAt: subYears(new Date(), 1),
      })
      await createSubscriber({ organizationId: orgId })

      const stats = await getStats(user.id, orgId)

      expect(stats.subscriberGrowth).toHaveLength(1)
      expect(stats.subscriberGrowth[0]?.count).toBe(3)
    })

    it("carries the running total across several days from the baseline", async () => {
      const { user, orgId } = await createUser()
      const now = new Date()

      await createSubscriber({
        organizationId: orgId,
        createdAt: subYears(now, 1),
      })
      for (const daysAgo of [10, 10, 5, 3, 3, 3, 1]) {
        await createSubscriber({
          organizationId: orgId,
          createdAt: subDays(now, daysAgo),
        })
      }

      const stats = await getStats(user.id, orgId)

      expect(stats.subscriberGrowth.map((p) => p.count)).toEqual([3, 4, 7, 8])
    })

    it("excludes subscribers from another organization", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      await createSubscriber({ organizationId: otherOrgId })

      const stats = await getStats(user.id, orgId)

      expect(stats.subscriberGrowth).toEqual([])
    })
  })

  describe("dbSize", () => {
    it("reports per-model counts for the organization", async () => {
      const { user, orgId } = await createUser()
      const campaign = await createCampaign({ organizationId: orgId })
      const subscriber = await createSubscriber({ organizationId: orgId })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
      })

      const stats = await getStats(user.id, orgId)

      expect(stats.dbSize).toMatchObject({
        organization_id: orgId,
        campaign_count: BigInt(1),
        message_count: BigInt(1),
        subscriber_count: BigInt(1),
      })
      expect(Number(stats.dbSize?.total_size_mb)).toBeGreaterThan(0)
    })

    it("reports zero counts for an empty organization", async () => {
      const { user, orgId } = await createUser()

      const stats = await getStats(user.id, orgId)

      expect(stats.dbSize).toMatchObject({
        organization_id: orgId,
        campaign_count: BigInt(0),
        template_count: BigInt(0),
        message_count: BigInt(0),
        subscriber_count: BigInt(0),
        list_count: BigInt(0),
        webhook_log_count: BigInt(0),
      })
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
        createCaller().dashboard.getStats({ organizationId: "org" }),
        "UNAUTHORIZED"
      )
    })
  })

  describe("window boundaries", () => {
    it("counts a message created just inside the six month window", async () => {
      const { user, orgId } = await createUser()
      const campaign = await createCampaign({ organizationId: orgId })
      const subscriber = await createSubscriber({ organizationId: orgId })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "SENT",
        createdAt: subDays(subMonths(new Date(), 6), -1),
      })

      const stats = await getStats(user.id, orgId)

      expect(stats.messageStats).toEqual({ SENT: 1 })
    })

    it("does not leak campaigns created before the window", async () => {
      const { user, orgId } = await createUser()
      await createCampaign({
        organizationId: orgId,
        status: "COMPLETED",
        createdAt: subMonths(new Date(), 7),
      })

      const stats = await getStats(user.id, orgId)

      expect(stats.recentCampaigns).toEqual([])
      expect(
        await prisma.campaign.count({ where: { organizationId: orgId } })
      ).toBe(1)
    })
  })
})
