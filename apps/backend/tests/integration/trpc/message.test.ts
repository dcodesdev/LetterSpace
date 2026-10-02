import { faker } from "@faker-js/faker"
import {
  createCampaign,
  createMessage,
  createSubscriber,
  createUser,
} from "@helpers/factories"
import { createCaller, expectTrpcError } from "@helpers/trpc"
import { prisma } from "@src/utils/prisma"
import { describe, expect, it } from "vitest"

const seedOrg = async () => {
  const { user, orgId } = await createUser()
  const campaign = await createCampaign({ organizationId: orgId })
  const subscriber = await createSubscriber({ organizationId: orgId })

  return { user, orgId, campaign, subscriber }
}

describe("trpc message router", () => {
  describe("list", () => {
    it("returns messages with pagination metadata", async () => {
      const { user, orgId, campaign, subscriber } = await seedOrg()
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
      })

      const result = await createCaller({ id: user.id }).message.list({
        organizationId: orgId,
        page: 1,
        perPage: 10,
      })

      expect(result.messages).toHaveLength(2)
      expect(result.pagination).toEqual({
        total: 2,
        totalPages: 1,
        page: 1,
        perPage: 10,
        hasMore: false,
      })
    })

    it("includes the campaign and subscriber summaries", async () => {
      const { user, orgId, campaign, subscriber } = await seedOrg()
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
      })

      const result = await createCaller({ id: user.id }).message.list({
        organizationId: orgId,
      })

      expect(result.messages[0]?.Campaign).toEqual({
        id: campaign.id,
        title: campaign.title,
      })
      expect(result.messages[0]?.Subscriber).toEqual({
        id: subscriber.id,
        email: subscriber.email,
        name: subscriber.name,
      })
    })

    it("filters by status", async () => {
      const { user, orgId, campaign, subscriber } = await seedOrg()
      const sent = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "SENT",
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "FAILED",
      })

      const result = await createCaller({ id: user.id }).message.list({
        organizationId: orgId,
        status: "SENT",
      })

      expect(result.messages.map((m) => m.id)).toEqual([sent.id])
      expect(result.pagination.total).toBe(1)
    })

    it("rejects a status outside the enum", async () => {
      const { user, orgId } = await seedOrg()

      await expectTrpcError(
        createCaller({ id: user.id }).message.list({
          organizationId: orgId,
          // @ts-expect-error deliberately invalid status
          status: "NOT_A_STATUS",
        }),
        "BAD_REQUEST"
      )
    })

    it("filters by campaign", async () => {
      const { user, orgId, campaign, subscriber } = await seedOrg()
      const otherCampaign = await createCampaign({ organizationId: orgId })
      const mine = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
      })
      await createMessage({
        campaignId: otherCampaign.id,
        subscriberId: subscriber.id,
      })

      const result = await createCaller({ id: user.id }).message.list({
        organizationId: orgId,
        campaignId: campaign.id,
      })

      expect(result.messages.map((m) => m.id)).toEqual([mine.id])
    })

    it("filters by subscriber", async () => {
      const { user, orgId, campaign, subscriber } = await seedOrg()
      const otherSubscriber = await createSubscriber({ organizationId: orgId })
      const mine = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: otherSubscriber.id,
      })

      const result = await createCaller({ id: user.id }).message.list({
        organizationId: orgId,
        subscriberId: subscriber.id,
      })

      expect(result.messages.map((m) => m.id)).toEqual([mine.id])
    })

    it("combines campaign and status filters", async () => {
      const { user, orgId, campaign, subscriber } = await seedOrg()
      const otherCampaign = await createCampaign({ organizationId: orgId })
      const wanted = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "OPENED",
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
      })
      await createMessage({
        campaignId: otherCampaign.id,
        subscriberId: subscriber.id,
        status: "OPENED",
      })

      const result = await createCaller({ id: user.id }).message.list({
        organizationId: orgId,
        campaignId: campaign.id,
        status: "OPENED",
      })

      expect(result.messages.map((m) => m.id)).toEqual([wanted.id])
    })

    it("searches subscriber name, subscriber email and campaign title", async () => {
      const { user, orgId } = await createUser()
      const campaign = await createCampaign({
        organizationId: orgId,
        title: "Spring Launch",
      })
      const otherCampaign = await createCampaign({
        organizationId: orgId,
        title: "Autumn Notes",
      })
      const byName = await createSubscriber({
        organizationId: orgId,
        name: "Sprinter Dan",
        email: "dan@example.com",
      })
      const byEmail = await createSubscriber({
        organizationId: orgId,
        name: "Nobody",
        email: "spring@example.com",
      })
      const unrelated = await createSubscriber({
        organizationId: orgId,
        name: "Nobody Else",
        email: "else@example.com",
      })

      const titleMatch = await createMessage({
        campaignId: campaign.id,
        subscriberId: unrelated.id,
      })
      const nameMatch = await createMessage({
        campaignId: otherCampaign.id,
        subscriberId: byName.id,
      })
      const emailMatch = await createMessage({
        campaignId: otherCampaign.id,
        subscriberId: byEmail.id,
      })
      await createMessage({
        campaignId: otherCampaign.id,
        subscriberId: unrelated.id,
      })

      const result = await createCaller({ id: user.id }).message.list({
        organizationId: orgId,
        search: "SPRIN",
      })

      expect(result.messages.map((m) => m.id).sort()).toEqual(
        [titleMatch.id, nameMatch.id, emailMatch.id].sort()
      )
    })

    it("paginates without overlap and orders by updatedAt descending", async () => {
      const { user, orgId, campaign, subscriber } = await seedOrg()
      const created = []
      for (let i = 0; i < 5; i++) {
        created.push(
          await createMessage({
            campaignId: campaign.id,
            subscriberId: subscriber.id,
          })
        )
      }

      const caller = createCaller({ id: user.id })
      const first = await caller.message.list({
        organizationId: orgId,
        page: 1,
        perPage: 2,
      })
      const second = await caller.message.list({
        organizationId: orgId,
        page: 2,
        perPage: 2,
      })
      const third = await caller.message.list({
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
      expect(third.messages).toHaveLength(1)

      const ids = [
        ...first.messages,
        ...second.messages,
        ...third.messages,
      ].map((m) => m.id)
      expect(new Set(ids).size).toBe(5)
      expect(ids[0]).toBe(created[4]?.id)
      expect(ids[4]).toBe(created[0]?.id)
    })

    it("rejects perPage above 100", async () => {
      const { user, orgId } = await seedOrg()

      await expectTrpcError(
        createCaller({ id: user.id }).message.list({
          organizationId: orgId,
          perPage: 101,
        }),
        "BAD_REQUEST"
      )
    })

    it("excludes messages from other organizations", async () => {
      const { user, orgId } = await seedOrg()
      const other = await seedOrg()
      await createMessage({
        campaignId: other.campaign.id,
        subscriberId: other.subscriber.id,
      })

      const result = await createCaller({ id: user.id }).message.list({
        organizationId: orgId,
      })

      expect(result.pagination.total).toBe(0)
    })

    it("rejects an organization the caller is not a member of", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).message.list({
          organizationId: otherOrgId,
        }),
        "UNAUTHORIZED"
      )
    })
  })

  describe("get", () => {
    it("returns a message with its campaign and subscriber", async () => {
      const { user, campaign, subscriber } = await seedOrg()
      const message = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
      })

      const result = await createCaller({ id: user.id }).message.get({
        id: message.id,
      })

      expect(result).toMatchObject({ id: message.id })
      expect(result.Campaign).toEqual({
        id: campaign.id,
        title: campaign.title,
        content: campaign.content,
      })
      expect(result.Subscriber.email).toBe(subscriber.email)
    })

    it("throws NOT_FOUND for an unknown id", async () => {
      const { user } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).message.get({ id: faker.string.uuid() }),
        "NOT_FOUND"
      )
    })

    it("does not return a message from another organization", async () => {
      const { user } = await createUser()
      const other = await seedOrg()
      const message = await createMessage({
        campaignId: other.campaign.id,
        subscriberId: other.subscriber.id,
      })

      await expectTrpcError(
        createCaller({ id: user.id }).message.get({ id: message.id }),
        "NOT_FOUND"
      )
    })
  })

  describe("resend", () => {
    it("requeues a failed message and clears its retry state", async () => {
      const { user, orgId, campaign, subscriber } = await seedOrg()
      const message = await prisma.message.update({
        where: {
          id: (
            await createMessage({
              campaignId: campaign.id,
              subscriberId: subscriber.id,
              status: "FAILED",
            })
          ).id,
        },
        data: {
          tries: 3,
          lastTriedAt: new Date(),
          error: "smtp exploded",
          messageId: "old-message-id",
        },
      })

      const result = await createCaller({ id: user.id }).message.resend({
        messageId: message.id,
        organizationId: orgId,
      })

      expect(result).toMatchObject({
        status: "QUEUED",
        tries: 0,
        lastTriedAt: null,
        error: null,
        messageId: null,
      })

      const stored = await prisma.message.findUnique({
        where: { id: message.id },
      })
      expect(stored?.status).toBe("QUEUED")
    })

    it("throws NOT_FOUND for an unknown message", async () => {
      const { user, orgId } = await seedOrg()

      await expectTrpcError(
        createCaller({ id: user.id }).message.resend({
          messageId: faker.string.uuid(),
          organizationId: orgId,
        }),
        "NOT_FOUND"
      )
    })

    it("rejects an organization the caller is not a member of", async () => {
      const { user } = await createUser()
      const other = await seedOrg()
      const message = await createMessage({
        campaignId: other.campaign.id,
        subscriberId: other.subscriber.id,
        status: "FAILED",
      })

      await expectTrpcError(
        createCaller({ id: user.id }).message.resend({
          messageId: message.id,
          organizationId: other.orgId,
        }),
        "UNAUTHORIZED"
      )

      const stored = await prisma.message.findUnique({
        where: { id: message.id },
      })
      expect(stored?.status).toBe("FAILED")
    })

    it("throws NOT_FOUND when the message belongs to another organization", async () => {
      const { user, orgId } = await seedOrg()
      const other = await seedOrg()
      const message = await createMessage({
        campaignId: other.campaign.id,
        subscriberId: other.subscriber.id,
        status: "FAILED",
      })

      await expectTrpcError(
        createCaller({ id: user.id }).message.resend({
          messageId: message.id,
          organizationId: orgId,
        }),
        "NOT_FOUND"
      )

      const stored = await prisma.message.findUnique({
        where: { id: message.id },
      })
      expect(stored?.status).toBe("FAILED")
    })
  })

  describe("authentication", () => {
    it.each([
      ["list", () => createCaller().message.list({ organizationId: "org" })],
      ["get", () => createCaller().message.get({ id: "id" })],
      [
        "resend",
        () =>
          createCaller().message.resend({
            messageId: "id",
            organizationId: "org",
          }),
      ],
    ])("%s requires authentication", async (_name, call) => {
      await expectTrpcError(call(), "UNAUTHORIZED")
    })
  })
})
