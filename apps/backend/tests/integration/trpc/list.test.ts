import { faker } from "@faker-js/faker"
import { createList, createSubscriber, createUser } from "@helpers/factories"
import { createCaller, expectTrpcError } from "@helpers/trpc"
import { prisma } from "@src/utils/prisma"
import { describe, expect, it } from "vitest"

describe("trpc list router", () => {
  describe("create", () => {
    it("creates a list in the caller's organization", async () => {
      const { user, orgId } = await createUser()

      const { list } = await createCaller({ id: user.id }).list.create({
        name: "Weekly Digest",
        description: "Every Monday",
        organizationId: orgId,
      })

      expect(list).toMatchObject({
        name: "Weekly Digest",
        description: "Every Monday",
      })

      const stored = await prisma.list.findUnique({ where: { id: list.id } })
      expect(stored?.organizationId).toBe(orgId)
    })

    it("allows an omitted description", async () => {
      const { user, orgId } = await createUser()

      const { list } = await createCaller({ id: user.id }).list.create({
        name: "No Description",
        organizationId: orgId,
      })

      expect(list.description).toBeNull()
    })

    it("rejects an empty name", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).list.create({
          name: "",
          organizationId: orgId,
        }),
        "BAD_REQUEST"
      )
    })

    it("rejects an organization the caller is not a member of", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).list.create({
          name: "Intruder",
          organizationId: otherOrgId,
        }),
        "NOT_FOUND"
      )

      const lists = await prisma.list.findMany({
        where: { organizationId: otherOrgId },
      })
      expect(lists).toHaveLength(0)
    })

    it("rejects an unknown organization", async () => {
      const { user } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).list.create({
          name: "Nowhere",
          organizationId: faker.string.uuid(),
        }),
        "NOT_FOUND"
      )
    })
  })

  describe("list", () => {
    it("returns the organization's lists with pagination metadata", async () => {
      const { user, orgId } = await createUser()
      await createList({ organizationId: orgId, name: "Alpha" })
      await createList({ organizationId: orgId, name: "Beta" })

      const result = await createCaller({ id: user.id }).list.list({
        organizationId: orgId,
      })

      expect(result.lists).toHaveLength(2)
      expect(result.pagination).toEqual({
        total: 2,
        totalPages: 1,
        page: 1,
        perPage: 10,
        hasMore: false,
      })
    })

    it("paginates", async () => {
      const { user, orgId } = await createUser()
      for (let i = 0; i < 5; i++) {
        await createList({ organizationId: orgId, name: `List ${i}` })
      }

      const caller = createCaller({ id: user.id })

      const first = await caller.list.list({
        organizationId: orgId,
        page: 1,
        perPage: 2,
      })
      const second = await caller.list.list({
        organizationId: orgId,
        page: 2,
        perPage: 2,
      })
      const third = await caller.list.list({
        organizationId: orgId,
        page: 3,
        perPage: 2,
      })

      expect(first.lists).toHaveLength(2)
      expect(second.lists).toHaveLength(2)
      expect(third.lists).toHaveLength(1)
      expect(first.pagination).toMatchObject({
        total: 5,
        totalPages: 3,
        hasMore: true,
      })
      expect(third.pagination.hasMore).toBe(false)

      const ids = [...first.lists, ...second.lists, ...third.lists].map(
        (l) => l.id
      )
      expect(new Set(ids).size).toBe(5)
    })

    it("orders newest first", async () => {
      const { user, orgId } = await createUser()
      const older = await createList({ organizationId: orgId, name: "Older" })
      await prisma.list.update({
        where: { id: older.id },
        data: { createdAt: new Date("2020-01-01") },
      })
      const newer = await createList({ organizationId: orgId, name: "Newer" })

      const { lists } = await createCaller({ id: user.id }).list.list({
        organizationId: orgId,
      })

      expect(lists.map((l) => l.id)).toEqual([newer.id, older.id])
    })

    it("searches by name and description, case-insensitively", async () => {
      const { user, orgId } = await createUser()
      await createList({ organizationId: orgId, name: "Product Updates" })
      await createList({
        organizationId: orgId,
        name: "Random",
        description: "Contains product news",
      })
      await createList({ organizationId: orgId, name: "Unrelated" })

      const { lists, pagination } = await createCaller({
        id: user.id,
      }).list.list({ organizationId: orgId, search: "PRODUCT" })

      expect(pagination.total).toBe(2)
      expect(lists.map((l) => l.name).sort()).toEqual([
        "Product Updates",
        "Random",
      ])
    })

    it("counts only subscribers that have not unsubscribed", async () => {
      const { user, orgId } = await createUser()
      const list = await createList({ organizationId: orgId })
      await createSubscriber({ organizationId: orgId, listIds: [list.id] })
      const unsubscribed = await createSubscriber({
        organizationId: orgId,
        listIds: [list.id],
      })
      await prisma.listSubscriber.updateMany({
        where: { subscriberId: unsubscribed.id },
        data: { unsubscribedAt: new Date() },
      })

      const { lists } = await createCaller({ id: user.id }).list.list({
        organizationId: orgId,
      })

      expect(lists[0]?._count.ListSubscribers).toBe(1)
    })

    it("does not return another organization's lists", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      await createList({ organizationId: orgId, name: "Mine" })
      await createList({ organizationId: otherOrgId, name: "Theirs" })

      const { lists } = await createCaller({ id: user.id }).list.list({
        organizationId: orgId,
      })

      expect(lists.map((l) => l.name)).toEqual(["Mine"])
    })

    it("rejects listing another organization", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).list.list({
          organizationId: otherOrgId,
        }),
        "NOT_FOUND"
      )
    })

    it("rejects perPage above the maximum", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).list.list({
          organizationId: orgId,
          perPage: 101,
        }),
        "BAD_REQUEST"
      )
    })
  })

  describe("get", () => {
    it("returns the list with its subscribers", async () => {
      const { user, orgId } = await createUser()
      const list = await createList({ organizationId: orgId })
      const subscriber = await createSubscriber({
        organizationId: orgId,
        listIds: [list.id],
      })

      const result = await createCaller({ id: user.id }).list.get({
        id: list.id,
      })

      expect(result.id).toBe(list.id)
      expect(result.Organization.id).toBe(orgId)
      expect(result.ListSubscribers).toHaveLength(1)
      expect(result.ListSubscribers[0]?.Subscriber.id).toBe(subscriber.id)
    })

    it("rejects an unknown id", async () => {
      const { user } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).list.get({ id: faker.string.uuid() }),
        "NOT_FOUND"
      )
    })

    it("rejects a list from another organization", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const list = await createList({ organizationId: otherOrgId })

      await expectTrpcError(
        createCaller({ id: user.id }).list.get({ id: list.id }),
        "UNAUTHORIZED"
      )
    })

    it("does not load subscribers before the membership check", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const list = await createList({ organizationId: otherOrgId })

      const original = prisma.list.findUnique
      const calls: unknown[] = []
      prisma.list.findUnique = ((args: unknown) => {
        calls.push(args)
        return original(args as Parameters<typeof original>[0])
      }) as typeof original

      try {
        await expectTrpcError(
          createCaller({ id: user.id }).list.get({ id: list.id }),
          "UNAUTHORIZED"
        )
      } finally {
        prisma.list.findUnique = original
      }

      expect(calls).toHaveLength(1)
      expect(calls[0]).not.toHaveProperty("include")
    })
  })

  describe("update", () => {
    it("updates name and description", async () => {
      const { user, orgId } = await createUser()
      const list = await createList({
        organizationId: orgId,
        name: "Before",
        description: "Old",
      })

      const result = await createCaller({ id: user.id }).list.update({
        id: list.id,
        name: "After",
        description: "New",
      })

      expect(result.list).toMatchObject({ name: "After", description: "New" })

      const stored = await prisma.list.findUnique({ where: { id: list.id } })
      expect(stored?.name).toBe("After")
    })

    it("rejects an empty name", async () => {
      const { user, orgId } = await createUser()
      const list = await createList({ organizationId: orgId })

      await expectTrpcError(
        createCaller({ id: user.id }).list.update({ id: list.id, name: "" }),
        "BAD_REQUEST"
      )
    })

    it("rejects an unknown id", async () => {
      const { user } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).list.update({
          id: faker.string.uuid(),
          name: "Nope",
        }),
        "NOT_FOUND"
      )
    })

    it("rejects a list from another organization and leaves it untouched", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const list = await createList({
        organizationId: otherOrgId,
        name: "Theirs",
      })

      await expectTrpcError(
        createCaller({ id: user.id }).list.update({
          id: list.id,
          name: "Hijacked",
        }),
        "UNAUTHORIZED"
      )

      const stored = await prisma.list.findUnique({ where: { id: list.id } })
      expect(stored?.name).toBe("Theirs")
    })
  })

  describe("delete", () => {
    it("deletes the list and its memberships", async () => {
      const { user, orgId } = await createUser()
      const list = await createList({ organizationId: orgId })
      const subscriber = await createSubscriber({
        organizationId: orgId,
        listIds: [list.id],
      })

      const result = await createCaller({ id: user.id }).list.delete({
        id: list.id,
      })

      expect(result).toEqual({ success: true })
      expect(
        await prisma.list.findUnique({ where: { id: list.id } })
      ).toBeNull()
      expect(
        await prisma.listSubscriber.count({ where: { listId: list.id } })
      ).toBe(0)
      // The subscriber itself survives.
      expect(
        await prisma.subscriber.findUnique({ where: { id: subscriber.id } })
      ).not.toBeNull()
    })

    it("rejects an unknown id", async () => {
      const { user } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).list.delete({ id: faker.string.uuid() }),
        "NOT_FOUND"
      )
    })

    it("rejects a list from another organization and leaves it in place", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const list = await createList({ organizationId: otherOrgId })

      await expectTrpcError(
        createCaller({ id: user.id }).list.delete({ id: list.id }),
        "UNAUTHORIZED"
      )

      expect(
        await prisma.list.findUnique({ where: { id: list.id } })
      ).not.toBeNull()
    })
  })

  describe("authentication", () => {
    it.each([
      [
        "create",
        () => createCaller().list.create({ name: "x", organizationId: "org" }),
      ],
      ["update", () => createCaller().list.update({ id: "id", name: "x" })],
      ["delete", () => createCaller().list.delete({ id: "id" })],
      ["get", () => createCaller().list.get({ id: "id" })],
      ["list", () => createCaller().list.list({ organizationId: "org" })],
    ])("%s requires authentication", async (_name, call) => {
      await expectTrpcError(call(), "UNAUTHORIZED")
    })
  })
})
