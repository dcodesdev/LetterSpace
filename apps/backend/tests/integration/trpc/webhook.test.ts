import { faker } from "@faker-js/faker"
import { createUser, createWebhook } from "@helpers/factories"
import { createCaller, expectTrpcError } from "@helpers/trpc"
import { prisma } from "@src/utils/prisma"
import { subMinutes } from "date-fns"
import { describe, expect, it } from "vitest"

const createLog = (webhookId: string, createdAt?: Date) =>
  prisma.webhookLog.create({
    data: {
      webhookId,
      requestBody: { event: "delivered" },
      responseCode: 200,
      duration: 12,
      createdAt,
    },
  })

describe("trpc webhook router", () => {
  describe("create", () => {
    it("creates a webhook for the organization", async () => {
      const { user, orgId } = await createUser()

      const { webhook } = await createCaller({ id: user.id }).webhook.create({
        organizationId: orgId,
        name: "Postmark",
        transformCode: "function transform(payload) { return payload }",
        authCode: "function authorize() { return true }",
      })

      expect(webhook).toMatchObject({
        name: "Postmark",
        organizationId: orgId,
        isActive: true,
      })

      const stored = await prisma.webhook.findUniqueOrThrow({
        where: { id: webhook.id },
      })
      expect(stored.transformCode).toBe(
        "function transform(payload) { return payload }"
      )
      expect(stored.authCode).toBe("function authorize() { return true }")
    })

    it("honours isActive: false", async () => {
      const { user, orgId } = await createUser()

      const { webhook } = await createCaller({ id: user.id }).webhook.create({
        organizationId: orgId,
        name: "Disabled",
        isActive: false,
      })

      expect(webhook.isActive).toBe(false)
    })

    it("leaves the code fields null when omitted", async () => {
      const { user, orgId } = await createUser()

      const { webhook } = await createCaller({ id: user.id }).webhook.create({
        organizationId: orgId,
        name: "Bare",
      })

      expect(webhook.transformCode).toBeNull()
      expect(webhook.authCode).toBeNull()
    })

    it("rejects an empty name", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).webhook.create({
          organizationId: orgId,
          name: "",
        }),
        "BAD_REQUEST"
      )

      expect(
        await prisma.webhook.count({ where: { organizationId: orgId } })
      ).toBe(0)
    })

    it("rejects an organization the caller is not a member of", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).webhook.create({
          organizationId: otherOrgId,
          name: "Sneaky",
        }),
        "UNAUTHORIZED"
      )

      expect(
        await prisma.webhook.count({ where: { organizationId: otherOrgId } })
      ).toBe(0)
    })
  })

  describe("list", () => {
    it("returns the organization's webhooks newest first", async () => {
      const { user, orgId } = await createUser()
      const first = await createWebhook({
        organizationId: orgId,
        name: "First",
      })
      const second = await createWebhook({
        organizationId: orgId,
        name: "Second",
      })
      await prisma.webhook.update({
        where: { id: first.id },
        data: { createdAt: subMinutes(new Date(), 10) },
      })

      const webhooks = await createCaller({ id: user.id }).webhook.list({
        organizationId: orgId,
      })

      expect(webhooks.map((w) => w.id)).toEqual([second.id, first.id])
    })

    it("is empty for an organization with no webhooks", async () => {
      const { user, orgId } = await createUser()

      expect(
        await createCaller({ id: user.id }).webhook.list({
          organizationId: orgId,
        })
      ).toEqual([])
    })

    it("excludes another organization's webhooks", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      await createWebhook({ organizationId: otherOrgId })

      expect(
        await createCaller({ id: user.id }).webhook.list({
          organizationId: orgId,
        })
      ).toEqual([])
    })

    it("rejects an organization the caller is not a member of", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).webhook.list({
          organizationId: otherOrgId,
        }),
        "UNAUTHORIZED"
      )
    })
  })

  describe("get", () => {
    it("returns a webhook by id", async () => {
      const { user, orgId } = await createUser()
      const webhook = await createWebhook({
        organizationId: orgId,
        name: "Hook",
      })

      const result = await createCaller({ id: user.id }).webhook.get({
        id: webhook.id,
        organizationId: orgId,
      })

      expect(result).toMatchObject({ id: webhook.id, name: "Hook" })
    })

    it("rejects an unknown id", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).webhook.get({
          id: faker.string.uuid(),
          organizationId: orgId,
        }),
        "NOT_FOUND"
      )
    })

    it("rejects another organization's webhook via the caller's own org id", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const webhook = await createWebhook({ organizationId: otherOrgId })

      await expectTrpcError(
        createCaller({ id: user.id }).webhook.get({
          id: webhook.id,
          organizationId: orgId,
        }),
        "NOT_FOUND"
      )
    })

    it("rejects another organization's webhook via their org id", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const webhook = await createWebhook({ organizationId: otherOrgId })

      await expectTrpcError(
        createCaller({ id: user.id }).webhook.get({
          id: webhook.id,
          organizationId: otherOrgId,
        }),
        "UNAUTHORIZED"
      )
    })
  })

  describe("update", () => {
    it("updates the name, active flag and code", async () => {
      const { user, orgId } = await createUser()
      const webhook = await createWebhook({
        organizationId: orgId,
        name: "Old",
      })

      const { webhook: updated } = await createCaller({
        id: user.id,
      }).webhook.update({
        id: webhook.id,
        organizationId: orgId,
        name: "New",
        isActive: false,
        transformCode: "function transform(p) { return p }",
      })

      expect(updated).toMatchObject({
        name: "New",
        isActive: false,
        transformCode: "function transform(p) { return p }",
      })
    })

    it("leaves omitted fields untouched", async () => {
      const { user, orgId } = await createUser()
      const webhook = await createWebhook({
        organizationId: orgId,
        isActive: false,
        transformCode: "function transform(p) { return p }",
      })

      const { webhook: updated } = await createCaller({
        id: user.id,
      }).webhook.update({
        id: webhook.id,
        organizationId: orgId,
        name: "Renamed",
      })

      expect(updated.name).toBe("Renamed")
      expect(updated.isActive).toBe(false)
      expect(updated.transformCode).toBe("function transform(p) { return p }")
    })

    it("rejects an empty name", async () => {
      const { user, orgId } = await createUser()
      const webhook = await createWebhook({
        organizationId: orgId,
        name: "Keep",
      })

      await expectTrpcError(
        createCaller({ id: user.id }).webhook.update({
          id: webhook.id,
          organizationId: orgId,
          name: "",
        }),
        "BAD_REQUEST"
      )

      expect(
        (await prisma.webhook.findUniqueOrThrow({ where: { id: webhook.id } }))
          .name
      ).toBe("Keep")
    })

    it("rejects an unknown id", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).webhook.update({
          id: faker.string.uuid(),
          organizationId: orgId,
          name: "Nope",
        }),
        "NOT_FOUND"
      )
    })

    it("rejects another organization's webhook and leaves it untouched", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const webhook = await createWebhook({
        organizationId: otherOrgId,
        name: "Theirs",
      })

      await expectTrpcError(
        createCaller({ id: user.id }).webhook.update({
          id: webhook.id,
          organizationId: otherOrgId,
          name: "Mine",
        }),
        "UNAUTHORIZED"
      )

      expect(
        (await prisma.webhook.findUniqueOrThrow({ where: { id: webhook.id } }))
          .name
      ).toBe("Theirs")
    })
  })

  describe("delete", () => {
    it("deletes the webhook and cascades its logs", async () => {
      const { user, orgId } = await createUser()
      const webhook = await createWebhook({ organizationId: orgId })
      await createLog(webhook.id)

      const result = await createCaller({ id: user.id }).webhook.delete({
        id: webhook.id,
        organizationId: orgId,
      })

      expect(result).toEqual({ success: true })
      expect(
        await prisma.webhook.findUnique({ where: { id: webhook.id } })
      ).toBeNull()
      expect(
        await prisma.webhookLog.count({ where: { webhookId: webhook.id } })
      ).toBe(0)
    })

    it("rejects an unknown id", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).webhook.delete({
          id: faker.string.uuid(),
          organizationId: orgId,
        }),
        "NOT_FOUND"
      )
    })

    it("rejects another organization's webhook and leaves it in place", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const webhook = await createWebhook({ organizationId: otherOrgId })

      await expectTrpcError(
        createCaller({ id: user.id }).webhook.delete({
          id: webhook.id,
          organizationId: otherOrgId,
        }),
        "UNAUTHORIZED"
      )

      expect(
        await prisma.webhook.findUnique({ where: { id: webhook.id } })
      ).not.toBeNull()
    })
  })

  describe("logs", () => {
    it("returns the webhook's logs newest first", async () => {
      const { user, orgId } = await createUser()
      const webhook = await createWebhook({ organizationId: orgId })
      const older = await createLog(webhook.id, subMinutes(new Date(), 10))
      const newer = await createLog(webhook.id)

      const result = await createCaller({ id: user.id }).webhook.logs({
        webhookId: webhook.id,
        organizationId: orgId,
      })

      expect(result.items.map((l) => l.id)).toEqual([newer.id, older.id])
      expect(result.nextCursor).toBeUndefined()
      expect(result.items[0]).toMatchObject({
        requestBody: { event: "delivered" },
        responseCode: 200,
      })
    })

    it("paginates with a cursor", async () => {
      const { user, orgId } = await createUser()
      const webhook = await createWebhook({ organizationId: orgId })
      const now = new Date()
      const ids: string[] = []
      for (let i = 0; i < 3; i++) {
        const log = await createLog(webhook.id, subMinutes(now, i))
        ids.push(log.id)
      }

      const caller = createCaller({ id: user.id })
      const first = await caller.webhook.logs({
        webhookId: webhook.id,
        organizationId: orgId,
        limit: 2,
      })

      expect(first.items.map((l) => l.id)).toEqual([ids[0], ids[1]])
      expect(first.nextCursor).toBe(ids[2])

      const second = await caller.webhook.logs({
        webhookId: webhook.id,
        organizationId: orgId,
        limit: 2,
        cursor: first.nextCursor,
      })

      expect(second.items.map((l) => l.id)).toEqual([ids[2]])
      expect(second.nextCursor).toBeUndefined()
    })

    it("is empty for a webhook with no logs", async () => {
      const { user, orgId } = await createUser()
      const webhook = await createWebhook({ organizationId: orgId })

      const result = await createCaller({ id: user.id }).webhook.logs({
        webhookId: webhook.id,
        organizationId: orgId,
      })

      expect(result.items).toEqual([])
    })

    it("rejects another organization's webhook id with NOT_FOUND", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const webhook = await createWebhook({ organizationId: otherOrgId })
      await createLog(webhook.id)

      await expectTrpcError(
        createCaller({ id: user.id }).webhook.logs({
          webhookId: webhook.id,
          organizationId: orgId,
        }),
        "NOT_FOUND"
      )
    })

    it("rejects an organization the caller is not a member of", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const webhook = await createWebhook({ organizationId: otherOrgId })

      await expectTrpcError(
        createCaller({ id: user.id }).webhook.logs({
          webhookId: webhook.id,
          organizationId: otherOrgId,
        }),
        "UNAUTHORIZED"
      )
    })

    it("rejects a limit above 100", async () => {
      const { user, orgId } = await createUser()
      const webhook = await createWebhook({ organizationId: orgId })

      await expectTrpcError(
        createCaller({ id: user.id }).webhook.logs({
          webhookId: webhook.id,
          organizationId: orgId,
          limit: 101,
        }),
        "BAD_REQUEST"
      )
    })
  })

  describe("authentication", () => {
    it.each([
      ["list", () => createCaller().webhook.list({ organizationId: "org" })],
      [
        "get",
        () => createCaller().webhook.get({ id: "id", organizationId: "org" }),
      ],
      [
        "logs",
        () =>
          createCaller().webhook.logs({
            webhookId: "id",
            organizationId: "org",
          }),
      ],
      [
        "create",
        () =>
          createCaller().webhook.create({
            organizationId: "org",
            name: "x",
          }),
      ],
      [
        "update",
        () =>
          createCaller().webhook.update({
            id: "id",
            organizationId: "org",
            name: "x",
          }),
      ],
      [
        "delete",
        () =>
          createCaller().webhook.delete({ id: "id", organizationId: "org" }),
      ],
    ])("%s requires authentication", async (_name, call) => {
      await expectTrpcError(call(), "UNAUTHORIZED")
    })
  })
})
