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
import { describe, expect, it } from "vitest"

const csv = (body: string) => {
  const formData = new FormData()
  formData.append(
    "file",
    new File([body], "subscribers.csv", { type: "text/csv" })
  )
  return formData
}

describe("trpc subscriber router", () => {
  describe("create", () => {
    it("creates a subscriber and its list memberships", async () => {
      const { user, orgId } = await createUser()
      const list = await createList({ organizationId: orgId })

      const { subscriber } = await createCaller({
        id: user.id,
      }).subscriber.create({
        email: "new@example.com",
        name: "New Person",
        organizationId: orgId,
        listIds: [list.id],
      })

      expect(subscriber).toMatchObject({
        email: "new@example.com",
        name: "New Person",
        organizationId: orgId,
      })

      const memberships = await prisma.listSubscriber.findMany({
        where: { subscriberId: subscriber.id },
      })
      expect(memberships.map((m) => m.listId)).toEqual([list.id])
    })

    it("defaults emailVerified to false", async () => {
      const { user, orgId } = await createUser()

      const { subscriber } = await createCaller({
        id: user.id,
      }).subscriber.create({
        email: "unverified@example.com",
        organizationId: orgId,
        listIds: [],
      })

      expect(subscriber.emailVerified).toBe(false)
    })

    it("stores metadata", async () => {
      const { user, orgId } = await createUser()

      const { subscriber } = await createCaller({
        id: user.id,
      }).subscriber.create({
        email: "meta@example.com",
        organizationId: orgId,
        listIds: [],
        metadata: [{ key: "plan", value: "pro" }],
      })

      const metadata = await prisma.subscriberMetadata.findMany({
        where: { subscriberId: subscriber.id },
      })
      expect(metadata).toHaveLength(1)
      expect(metadata[0]).toMatchObject({ key: "plan", value: "pro" })
    })

    it("rejects a duplicate email in the same organization", async () => {
      const { user, orgId } = await createUser()
      await createSubscriber({
        organizationId: orgId,
        email: "dup@example.com",
      })

      await expectTrpcError(
        createCaller({ id: user.id }).subscriber.create({
          email: "dup@example.com",
          organizationId: orgId,
          listIds: [],
        }),
        "CONFLICT"
      )

      expect(
        await prisma.subscriber.count({
          where: { organizationId: orgId, email: "dup@example.com" },
        })
      ).toBe(1)
    })

    it("allows the same email in a different organization", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      await createSubscriber({
        organizationId: otherOrgId,
        email: "shared@example.com",
      })

      const { subscriber } = await createCaller({
        id: user.id,
      }).subscriber.create({
        email: "shared@example.com",
        organizationId: orgId,
        listIds: [],
      })

      expect(subscriber.organizationId).toBe(orgId)
    })

    it("rejects an invalid email", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).subscriber.create({
          email: "not-an-email",
          organizationId: orgId,
          listIds: [],
        }),
        "BAD_REQUEST"
      )
    })

    it("rejects an organization the caller is not a member of", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).subscriber.create({
          email: "intruder@example.com",
          organizationId: otherOrgId,
          listIds: [],
        }),
        "UNAUTHORIZED"
      )

      expect(
        await prisma.subscriber.count({ where: { organizationId: otherOrgId } })
      ).toBe(0)
    })

    it("rejects a list from another organization", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const mine = await createList({ organizationId: orgId })
      const theirs = await createList({ organizationId: otherOrgId })

      await expectTrpcError(
        createCaller({ id: user.id }).subscriber.create({
          email: "sneaky@example.com",
          organizationId: orgId,
          listIds: [mine.id, theirs.id],
        }),
        "NOT_FOUND"
      )

      expect(
        await prisma.subscriber.count({ where: { organizationId: orgId } })
      ).toBe(0)
      expect(
        await prisma.listSubscriber.count({ where: { listId: theirs.id } })
      ).toBe(0)
    })
  })

  describe("list", () => {
    it("returns subscribers with their list memberships and metadata", async () => {
      const { user, orgId } = await createUser()
      const list = await createList({ organizationId: orgId, name: "Main" })
      const subscriber = await createSubscriber({
        organizationId: orgId,
        listIds: [list.id],
      })
      await prisma.subscriberMetadata.create({
        data: { subscriberId: subscriber.id, key: "plan", value: "free" },
      })

      const { subscribers, pagination } = await createCaller({
        id: user.id,
      }).subscriber.list({ organizationId: orgId })

      expect(subscribers).toHaveLength(1)
      expect(subscribers[0]?.ListSubscribers[0]?.List).toMatchObject({
        id: list.id,
        name: "Main",
      })
      expect(subscribers[0]?.Metadata[0]?.key).toBe("plan")
      expect(pagination).toEqual({
        total: 1,
        totalPages: 1,
        page: 1,
        perPage: 10,
        hasMore: false,
      })
    })

    it("paginates", async () => {
      const { user, orgId } = await createUser()
      for (let i = 0; i < 5; i++) {
        await createSubscriber({
          organizationId: orgId,
          email: `p${i}@example.com`,
        })
      }

      const caller = createCaller({ id: user.id })
      const first = await caller.subscriber.list({
        organizationId: orgId,
        page: 1,
        perPage: 2,
      })
      const last = await caller.subscriber.list({
        organizationId: orgId,
        page: 3,
        perPage: 2,
      })

      expect(first.subscribers).toHaveLength(2)
      expect(first.pagination).toMatchObject({ totalPages: 3, hasMore: true })
      expect(last.subscribers).toHaveLength(1)
      expect(last.pagination.hasMore).toBe(false)
    })

    it("searches by name and email, case-insensitively", async () => {
      const { user, orgId } = await createUser()
      await createSubscriber({
        organizationId: orgId,
        email: "match@example.com",
        name: "Nothing",
      })
      await createSubscriber({
        organizationId: orgId,
        email: "other@example.com",
        name: "Matcher Person",
      })
      await createSubscriber({
        organizationId: orgId,
        email: "third@example.com",
        name: "Unrelated",
      })

      const { subscribers, pagination } = await createCaller({
        id: user.id,
      }).subscriber.list({ organizationId: orgId, search: "MATCH" })

      expect(pagination.total).toBe(2)
      expect(subscribers.map((s) => s.email).sort()).toEqual([
        "match@example.com",
        "other@example.com",
      ])
    })

    it("does not return another organization's subscribers", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      await createSubscriber({
        organizationId: orgId,
        email: "mine@example.com",
      })
      await createSubscriber({
        organizationId: otherOrgId,
        email: "theirs@example.com",
      })

      const { subscribers } = await createCaller({
        id: user.id,
      }).subscriber.list({ organizationId: orgId })

      expect(subscribers.map((s) => s.email)).toEqual(["mine@example.com"])
    })

    it("rejects listing another organization", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).subscriber.list({
          organizationId: otherOrgId,
        }),
        "UNAUTHORIZED"
      )
    })
  })

  describe("get", () => {
    it("returns the subscriber with lists, metadata and recent messages", async () => {
      const { user, orgId } = await createUser()
      const list = await createList({ organizationId: orgId })
      const subscriber = await createSubscriber({
        organizationId: orgId,
        listIds: [list.id],
      })
      const campaign = await createCampaign({ organizationId: orgId })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
      })

      const result = await createCaller({ id: user.id }).subscriber.get({
        id: subscriber.id,
        organizationId: orgId,
      })

      expect(result.id).toBe(subscriber.id)
      expect(result.ListSubscribers[0]?.List.id).toBe(list.id)
      expect(result.Messages).toHaveLength(1)
    })

    it("rejects an unknown id", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).subscriber.get({
          id: faker.string.uuid(),
          organizationId: orgId,
        }),
        "NOT_FOUND"
      )
    })

    it("does not read a subscriber from another organization", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const subscriber = await createSubscriber({
        organizationId: otherOrgId,
      })

      await expectTrpcError(
        createCaller({ id: user.id }).subscriber.get({
          id: subscriber.id,
          organizationId: orgId,
        }),
        "NOT_FOUND"
      )

      await expectTrpcError(
        createCaller({ id: user.id }).subscriber.get({
          id: subscriber.id,
          organizationId: otherOrgId,
        }),
        "UNAUTHORIZED"
      )
    })
  })

  describe("update", () => {
    it("rejects adding a list from another organization", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const theirs = await createList({ organizationId: otherOrgId })
      const subscriber = await createSubscriber({ organizationId: orgId })

      await expectTrpcError(
        createCaller({ id: user.id }).subscriber.update({
          id: subscriber.id,
          email: subscriber.email,
          organizationId: orgId,
          listIds: [theirs.id],
        }),
        "NOT_FOUND"
      )

      expect(
        await prisma.listSubscriber.count({ where: { listId: theirs.id } })
      ).toBe(0)
    })

    it("updates the email, name and verification flag", async () => {
      const { user, orgId } = await createUser()
      const subscriber = await createSubscriber({
        organizationId: orgId,
        email: "before@example.com",
        emailVerified: false,
      })

      const result = await createCaller({ id: user.id }).subscriber.update({
        id: subscriber.id,
        email: "after@example.com",
        name: "After",
        organizationId: orgId,
        listIds: [],
        emailVerified: true,
      })

      expect(result.subscriber).toMatchObject({
        email: "after@example.com",
        name: "After",
        emailVerified: true,
      })
    })

    it("adds and removes list memberships", async () => {
      const { user, orgId } = await createUser()
      const keep = await createList({ organizationId: orgId, name: "Keep" })
      const drop = await createList({ organizationId: orgId, name: "Drop" })
      const add = await createList({ organizationId: orgId, name: "Add" })
      const subscriber = await createSubscriber({
        organizationId: orgId,
        listIds: [keep.id, drop.id],
      })

      const result = await createCaller({ id: user.id }).subscriber.update({
        id: subscriber.id,
        email: subscriber.email,
        organizationId: orgId,
        listIds: [keep.id, add.id],
      })

      expect(
        result.subscriber.ListSubscribers.map((ls) => ls.listId).sort()
      ).toEqual([keep.id, add.id].sort())

      const stored = await prisma.listSubscriber.findMany({
        where: { subscriberId: subscriber.id },
      })
      expect(stored.map((ls) => ls.listId).sort()).toEqual(
        [keep.id, add.id].sort()
      )
    })

    it("replaces metadata, keeps it when omitted and clears it when empty", async () => {
      const { user, orgId } = await createUser()
      const subscriber = await createSubscriber({ organizationId: orgId })
      const caller = createCaller({ id: user.id })

      await caller.subscriber.update({
        id: subscriber.id,
        email: subscriber.email,
        organizationId: orgId,
        listIds: [],
        metadata: [{ key: "plan", value: "pro" }],
      })

      expect(
        await prisma.subscriberMetadata.findMany({
          where: { subscriberId: subscriber.id },
        })
      ).toMatchObject([{ key: "plan", value: "pro" }])

      await caller.subscriber.update({
        id: subscriber.id,
        email: subscriber.email,
        organizationId: orgId,
        listIds: [],
      })

      expect(
        await prisma.subscriberMetadata.findMany({
          where: { subscriberId: subscriber.id },
        })
      ).toMatchObject([{ key: "plan", value: "pro" }])

      await caller.subscriber.update({
        id: subscriber.id,
        email: subscriber.email,
        organizationId: orgId,
        listIds: [],
        metadata: [],
      })

      expect(
        await prisma.subscriberMetadata.count({
          where: { subscriberId: subscriber.id },
        })
      ).toBe(0)
    })

    it("rejects over-long metadata keys and values", async () => {
      const { user, orgId } = await createUser()
      const subscriber = await createSubscriber({ organizationId: orgId })
      const caller = createCaller({ id: user.id })

      await expectTrpcError(
        caller.subscriber.update({
          id: subscriber.id,
          email: subscriber.email,
          organizationId: orgId,
          listIds: [],
          metadata: [{ key: "k".repeat(65), value: "v" }],
        }),
        "BAD_REQUEST"
      )

      await expectTrpcError(
        caller.subscriber.update({
          id: subscriber.id,
          email: subscriber.email,
          organizationId: orgId,
          listIds: [],
          metadata: [{ key: "k", value: "v".repeat(257) }],
        }),
        "BAD_REQUEST"
      )

      expect(
        await prisma.subscriberMetadata.count({
          where: { subscriberId: subscriber.id },
        })
      ).toBe(0)
    })

    it("rejects an invalid email", async () => {
      const { user, orgId } = await createUser()
      const subscriber = await createSubscriber({ organizationId: orgId })

      await expectTrpcError(
        createCaller({ id: user.id }).subscriber.update({
          id: subscriber.id,
          email: "nope",
          organizationId: orgId,
          listIds: [],
        }),
        "BAD_REQUEST"
      )
    })

    it("rejects an unknown id", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).subscriber.update({
          id: faker.string.uuid(),
          email: "x@example.com",
          organizationId: orgId,
          listIds: [],
        }),
        "NOT_FOUND"
      )
    })

    it("does not update a subscriber from another organization", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const subscriber = await createSubscriber({
        organizationId: otherOrgId,
        email: "theirs@example.com",
      })
      const caller = createCaller({ id: user.id })

      await expectTrpcError(
        caller.subscriber.update({
          id: subscriber.id,
          email: "hijacked@example.com",
          organizationId: orgId,
          listIds: [],
        }),
        "NOT_FOUND"
      )

      await expectTrpcError(
        caller.subscriber.update({
          id: subscriber.id,
          email: "hijacked@example.com",
          organizationId: otherOrgId,
          listIds: [],
        }),
        "UNAUTHORIZED"
      )

      const stored = await prisma.subscriber.findUnique({
        where: { id: subscriber.id },
      })
      expect(stored?.email).toBe("theirs@example.com")
    })
  })

  describe("delete", () => {
    it("deletes the subscriber and its memberships", async () => {
      const { user, orgId } = await createUser()
      const list = await createList({ organizationId: orgId })
      const subscriber = await createSubscriber({
        organizationId: orgId,
        listIds: [list.id],
      })

      const result = await createCaller({ id: user.id }).subscriber.delete({
        id: subscriber.id,
        organizationId: orgId,
      })

      expect(result).toEqual({ success: true })
      expect(
        await prisma.subscriber.findUnique({ where: { id: subscriber.id } })
      ).toBeNull()
      expect(
        await prisma.listSubscriber.count({
          where: { subscriberId: subscriber.id },
        })
      ).toBe(0)
      expect(
        await prisma.list.findUnique({ where: { id: list.id } })
      ).not.toBeNull()
    })

    it("rejects an unknown id", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).subscriber.delete({
          id: faker.string.uuid(),
          organizationId: orgId,
        }),
        "NOT_FOUND"
      )
    })

    it("does not delete a subscriber from another organization", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const subscriber = await createSubscriber({ organizationId: otherOrgId })
      const caller = createCaller({ id: user.id })

      await expectTrpcError(
        caller.subscriber.delete({
          id: subscriber.id,
          organizationId: orgId,
        }),
        "NOT_FOUND"
      )

      await expectTrpcError(
        caller.subscriber.delete({
          id: subscriber.id,
          organizationId: otherOrgId,
        }),
        "UNAUTHORIZED"
      )

      expect(
        await prisma.subscriber.findUnique({ where: { id: subscriber.id } })
      ).not.toBeNull()
    })
  })

  describe("import", () => {
    it("rejects a list from another organization", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const theirs = await createList({ organizationId: otherOrgId })

      await expectTrpcError(
        createCaller({ id: user.id }).subscriber.import({
          file: csv("email\na@example.com\n"),
          organizationId: orgId,
          listId: theirs.id,
        }),
        "NOT_FOUND"
      )

      expect(
        await prisma.subscriber.count({ where: { organizationId: orgId } })
      ).toBe(0)
      expect(
        await prisma.listSubscriber.count({ where: { listId: theirs.id } })
      ).toBe(0)
    })

    it("imports subscribers from a csv", async () => {
      const { user, orgId } = await createUser()

      const result = await createCaller({ id: user.id }).subscriber.import({
        file: csv(
          "email,first_name,last_name\na@example.com,Ada,Lovelace\nb@example.com,Alan,Turing\n"
        ),
        organizationId: orgId,
      })

      expect(result).toEqual({ count: 2 })

      const subscribers = await prisma.subscriber.findMany({
        where: { organizationId: orgId },
        orderBy: { email: "asc" },
      })
      expect(subscribers.map((s) => [s.email, s.name])).toEqual([
        ["a@example.com", "Ada Lovelace"],
        ["b@example.com", "Alan Turing"],
      ])
    })

    it("prefers a name column and tolerates a missing name", async () => {
      const { user, orgId } = await createUser()

      await createCaller({ id: user.id }).subscriber.import({
        file: csv(
          "email,name\nnamed@example.com,Grace Hopper\nbare@example.com,\n"
        ),
        organizationId: orgId,
      })

      const subscribers = await prisma.subscriber.findMany({
        where: { organizationId: orgId },
        orderBy: { email: "asc" },
      })
      expect(subscribers.map((s) => s.name)).toEqual([null, "Grace Hopper"])
    })

    it("adds every imported subscriber to the given list", async () => {
      const { user, orgId } = await createUser()
      const list = await createList({ organizationId: orgId })

      await createCaller({ id: user.id }).subscriber.import({
        file: csv("email\na@example.com\nb@example.com\n"),
        organizationId: orgId,
        listId: list.id,
      })

      expect(
        await prisma.listSubscriber.count({ where: { listId: list.id } })
      ).toBe(2)
    })

    it("is idempotent for an email that already exists", async () => {
      const { user, orgId } = await createUser()
      const list = await createList({ organizationId: orgId })
      await createSubscriber({
        organizationId: orgId,
        email: "a@example.com",
        name: "Old Name",
      })
      const caller = createCaller({ id: user.id })
      const file = "email,name\na@example.com,New Name\n"

      await caller.subscriber.import({
        file: csv(file),
        organizationId: orgId,
        listId: list.id,
      })
      const second = await caller.subscriber.import({
        file: csv(file),
        organizationId: orgId,
        listId: list.id,
      })

      expect(second).toEqual({ count: 1 })
      const subscribers = await prisma.subscriber.findMany({
        where: { organizationId: orgId },
      })
      expect(subscribers).toHaveLength(1)
      expect(subscribers[0]?.name).toBe("New Name")
      expect(
        await prisma.listSubscriber.count({ where: { listId: list.id } })
      ).toBe(1)
    })

    it("rejects a row without an email", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).subscriber.import({
          file: csv("email,name\na@example.com,Ada\n,Nobody\n"),
          organizationId: orgId,
        }),
        "BAD_REQUEST"
      )

      expect(
        await prisma.subscriber.count({ where: { organizationId: orgId } })
      ).toBe(0)
    })

    it("rejects a csv with an inconsistent column count", async () => {
      const { user, orgId } = await createUser()

      await expect(
        createCaller({ id: user.id }).subscriber.import({
          file: csv("email,name\na@example.com,Ada,extra\n"),
          organizationId: orgId,
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: expect.stringMatching(/^Invalid CSV: /),
      })

      expect(
        await prisma.subscriber.count({ where: { organizationId: orgId } })
      ).toBe(0)
    })

    it("keeps the last row when an email appears twice", async () => {
      const { user, orgId } = await createUser()
      const list = await createList({ organizationId: orgId })

      const result = await createCaller({ id: user.id }).subscriber.import({
        file: csv(
          "email,name\ndup@example.com,First\nother@example.com,Other\ndup@example.com,Second\n"
        ),
        organizationId: orgId,
        listId: list.id,
      })

      expect(result).toEqual({ count: 2 })
      const subscribers = await prisma.subscriber.findMany({
        where: { organizationId: orgId, email: "dup@example.com" },
      })
      expect(subscribers).toHaveLength(1)
      expect(subscribers[0]?.name).toBe("Second")
      expect(
        await prisma.listSubscriber.count({ where: { listId: list.id } })
      ).toBe(2)
    })

    it("rejects a form without a file", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).subscriber.import({
          file: new FormData(),
          organizationId: orgId,
        }),
        "BAD_REQUEST"
      )
    })

    it("imports nothing from a header-only csv", async () => {
      const { user, orgId } = await createUser()

      const result = await createCaller({ id: user.id }).subscriber.import({
        file: csv("email,name\n"),
        organizationId: orgId,
      })

      expect(result).toEqual({ count: 0 })
    })

    it("rejects importing into another organization", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).subscriber.import({
          file: csv("email\nintruder@example.com\n"),
          organizationId: otherOrgId,
        }),
        "UNAUTHORIZED"
      )

      expect(
        await prisma.subscriber.count({ where: { organizationId: otherOrgId } })
      ).toBe(0)
    })
  })

  describe("unsubscribeToggle", () => {
    it("unsubscribes and resubscribes a membership", async () => {
      const { user, orgId } = await createUser()
      const list = await createList({ organizationId: orgId })
      const subscriber = await createSubscriber({
        organizationId: orgId,
        listIds: [list.id],
      })
      const listSubscriberId = subscriber.ListSubscribers[0]!.id
      const caller = createCaller({ id: user.id })

      const off = await caller.subscriber.unsubscribeToggle({
        listSubscriberId,
        organizationId: orgId,
      })
      expect(off).toEqual({ success: true, subbed: false })
      expect(
        (
          await prisma.listSubscriber.findUnique({
            where: { id: listSubscriberId },
          })
        )?.unsubscribedAt
      ).not.toBeNull()

      const on = await caller.subscriber.unsubscribeToggle({
        listSubscriberId,
        organizationId: orgId,
      })
      expect(on).toEqual({ success: true, subbed: true })
      expect(
        (
          await prisma.listSubscriber.findUnique({
            where: { id: listSubscriberId },
          })
        )?.unsubscribedAt
      ).toBeNull()
    })

    it("cancels pending messages for campaigns using the list", async () => {
      const { user, orgId } = await createUser()
      const list = await createList({ organizationId: orgId })
      const otherList = await createList({ organizationId: orgId })
      const subscriber = await createSubscriber({
        organizationId: orgId,
        listIds: [list.id],
      })
      const campaign = await createCampaign({
        organizationId: orgId,
        listIds: [list.id],
      })
      const otherCampaign = await createCampaign({
        organizationId: orgId,
        listIds: [otherList.id],
      })

      const queued = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
      })
      const sent = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "SENT",
      })
      const unrelated = await createMessage({
        campaignId: otherCampaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
      })

      await createCaller({ id: user.id }).subscriber.unsubscribeToggle({
        listSubscriberId: subscriber.ListSubscribers[0]!.id,
        organizationId: orgId,
      })

      const [q, s, u] = await Promise.all([
        prisma.message.findUnique({ where: { id: queued.id } }),
        prisma.message.findUnique({ where: { id: sent.id } }),
        prisma.message.findUnique({ where: { id: unrelated.id } }),
      ])

      expect(q?.status).toBe("CANCELLED")
      expect(q?.error).toBe("Subscriber unsubscribed from list")
      expect(s?.status).toBe("SENT")
      expect(u?.status).toBe("QUEUED")
    })

    it("does not cancel messages when resubscribing", async () => {
      const { user, orgId } = await createUser()
      const list = await createList({ organizationId: orgId })
      const subscriber = await createSubscriber({
        organizationId: orgId,
        listIds: [list.id],
      })
      await prisma.listSubscriber.update({
        where: { id: subscriber.ListSubscribers[0]!.id },
        data: { unsubscribedAt: new Date() },
      })
      const campaign = await createCampaign({
        organizationId: orgId,
        listIds: [list.id],
      })
      const queued = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
      })

      await createCaller({ id: user.id }).subscriber.unsubscribeToggle({
        listSubscriberId: subscriber.ListSubscribers[0]!.id,
        organizationId: orgId,
      })

      expect(
        (await prisma.message.findUnique({ where: { id: queued.id } }))?.status
      ).toBe("QUEUED")
    })

    it("rejects an unknown membership", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).subscriber.unsubscribeToggle({
          listSubscriberId: faker.string.uuid(),
          organizationId: orgId,
        }),
        "NOT_FOUND"
      )
    })

    it("does not toggle a membership from another organization", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const list = await createList({ organizationId: otherOrgId })
      const subscriber = await createSubscriber({
        organizationId: otherOrgId,
        listIds: [list.id],
      })
      const listSubscriberId = subscriber.ListSubscribers[0]!.id
      const caller = createCaller({ id: user.id })

      await expectTrpcError(
        caller.subscriber.unsubscribeToggle({
          listSubscriberId,
          organizationId: orgId,
        }),
        "NOT_FOUND"
      )

      await expectTrpcError(
        caller.subscriber.unsubscribeToggle({
          listSubscriberId,
          organizationId: otherOrgId,
        }),
        "UNAUTHORIZED"
      )

      expect(
        (
          await prisma.listSubscriber.findUnique({
            where: { id: listSubscriberId },
          })
        )?.unsubscribedAt
      ).toBeNull()
    })
  })

  describe("unsubscribe (public)", () => {
    it("unsubscribes from every list when no campaign is given", async () => {
      const { orgId } = await createUser()
      const a = await createList({ organizationId: orgId })
      const b = await createList({ organizationId: orgId })
      const subscriber = await createSubscriber({
        organizationId: orgId,
        listIds: [a.id, b.id],
      })

      const result = await createCaller().subscriber.unsubscribe({
        sid: subscriber.id,
      })

      expect(result).toEqual({ success: true })
      const memberships = await prisma.listSubscriber.findMany({
        where: { subscriberId: subscriber.id },
      })
      expect(memberships.every((m) => m.unsubscribedAt !== null)).toBe(true)
    })

    it("unsubscribes only from the campaign's lists and bumps its counter", async () => {
      const { orgId } = await createUser()
      const targeted = await createList({ organizationId: orgId })
      const untouched = await createList({ organizationId: orgId })
      const subscriber = await createSubscriber({
        organizationId: orgId,
        listIds: [targeted.id, untouched.id],
      })
      const campaign = await createCampaign({
        organizationId: orgId,
        listIds: [targeted.id],
      })
      const queued = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
      })

      await createCaller().subscriber.unsubscribe({
        sid: subscriber.id,
        cid: campaign.id,
      })

      const memberships = await prisma.listSubscriber.findMany({
        where: { subscriberId: subscriber.id },
      })
      const byList = Object.fromEntries(
        memberships.map((m) => [m.listId, m.unsubscribedAt])
      )
      expect(byList[targeted.id]).not.toBeNull()
      expect(byList[untouched.id]).toBeNull()

      const message = await prisma.message.findUnique({
        where: { id: queued.id },
      })
      expect(message?.status).toBe("CANCELLED")
      expect(message?.error).toBe("Subscriber unsubscribed")

      expect(
        (await prisma.campaign.findUnique({ where: { id: campaign.id } }))
          ?.unsubscribedCount
      ).toBe(1)
    })

    it("succeeds for an unknown subscriber", async () => {
      const result = await createCaller().subscriber.unsubscribe({
        sid: faker.string.uuid(),
      })

      expect(result).toEqual({ success: true })
    })

    it("is idempotent", async () => {
      const { orgId } = await createUser()
      const list = await createList({ organizationId: orgId })
      const subscriber = await createSubscriber({
        organizationId: orgId,
        listIds: [list.id],
      })

      await createCaller().subscriber.unsubscribe({ sid: subscriber.id })
      const first = await prisma.listSubscriber.findFirst({
        where: { subscriberId: subscriber.id },
      })

      await createCaller().subscriber.unsubscribe({ sid: subscriber.id })
      const second = await prisma.listSubscriber.findFirst({
        where: { subscriberId: subscriber.id },
      })

      expect(second?.unsubscribedAt).toEqual(first?.unsubscribedAt)
    })
  })

  describe("verifyEmail", () => {
    it("verifies a subscriber and clears the token", async () => {
      const { orgId } = await createUser()
      const subscriber = await createSubscriber({
        organizationId: orgId,
        emailVerified: false,
      })
      await prisma.subscriber.update({
        where: { id: subscriber.id },
        data: {
          emailVerificationToken: "valid-token",
          emailVerificationTokenExpiresAt: new Date(Date.now() + 60_000),
        },
      })

      const result = await createCaller().subscriber.verifyEmail({
        token: "valid-token",
      })

      expect(result).toEqual({ success: true })
      const stored = await prisma.subscriber.findUnique({
        where: { id: subscriber.id },
      })
      expect(stored).toMatchObject({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiresAt: null,
      })
    })

    it("rejects an expired token", async () => {
      const { orgId } = await createUser()
      const subscriber = await createSubscriber({
        organizationId: orgId,
        emailVerified: false,
      })
      await prisma.subscriber.update({
        where: { id: subscriber.id },
        data: {
          emailVerificationToken: "expired-token",
          emailVerificationTokenExpiresAt: new Date(Date.now() - 60_000),
        },
      })

      await expectTrpcError(
        createCaller().subscriber.verifyEmail({ token: "expired-token" }),
        "NOT_FOUND"
      )

      expect(
        (await prisma.subscriber.findUnique({ where: { id: subscriber.id } }))
          ?.emailVerified
      ).toBe(false)
    })

    it("rejects an unknown token", async () => {
      await expectTrpcError(
        createCaller().subscriber.verifyEmail({ token: "nope" }),
        "NOT_FOUND"
      )
    })
  })

  describe("authentication", () => {
    it.each([
      [
        "create",
        () =>
          createCaller().subscriber.create({
            email: "a@example.com",
            organizationId: "org",
            listIds: [],
          }),
      ],
      [
        "update",
        () =>
          createCaller().subscriber.update({
            id: "id",
            email: "a@example.com",
            organizationId: "org",
            listIds: [],
          }),
      ],
      [
        "delete",
        () =>
          createCaller().subscriber.delete({ id: "id", organizationId: "org" }),
      ],
      [
        "get",
        () =>
          createCaller().subscriber.get({ id: "id", organizationId: "org" }),
      ],
      ["list", () => createCaller().subscriber.list({ organizationId: "org" })],
      [
        "import",
        () =>
          createCaller().subscriber.import({
            file: new FormData(),
            organizationId: "org",
          }),
      ],
      [
        "unsubscribeToggle",
        () =>
          createCaller().subscriber.unsubscribeToggle({
            listSubscriberId: "id",
            organizationId: "org",
          }),
      ],
    ])("%s requires authentication", async (_name, call) => {
      await expectTrpcError(call(), "UNAUTHORIZED")
    })
  })
})
