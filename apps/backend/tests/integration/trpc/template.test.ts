import { faker } from "@faker-js/faker"
import { createTemplate, createUser } from "@helpers/factories"
import { createCaller, expectTrpcError } from "@helpers/trpc"
import { prisma } from "@src/utils/prisma"
import { describe, expect, it } from "vitest"

const CONTENT = "<html><body>{{content}}</body></html>"

describe("trpc template router", () => {
  describe("create", () => {
    it("creates a template in the caller's organization", async () => {
      const { user, orgId } = await createUser()

      const { template } = await createCaller({ id: user.id }).template.create({
        name: "Newsletter",
        description: "Weekly layout",
        content: CONTENT,
        organizationId: orgId,
      })

      expect(template).toMatchObject({
        name: "Newsletter",
        description: "Weekly layout",
        content: CONTENT,
        organizationId: orgId,
      })

      const stored = await prisma.template.findUnique({
        where: { id: template.id },
      })
      expect(stored?.content).toBe(CONTENT)
    })

    it("allows an omitted description", async () => {
      const { user, orgId } = await createUser()

      const { template } = await createCaller({ id: user.id }).template.create({
        name: "No Description",
        content: CONTENT,
        organizationId: orgId,
      })

      expect(template.description).toBeNull()
    })

    it("rejects an empty name", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).template.create({
          name: "",
          content: CONTENT,
          organizationId: orgId,
        }),
        "BAD_REQUEST"
      )
    })

    it("rejects empty content", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).template.create({
          name: "Empty",
          content: "",
          organizationId: orgId,
        }),
        "BAD_REQUEST"
      )
    })

    it("rejects content without the {{content}} placeholder", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).template.create({
          name: "No placeholder",
          content: "<p>Nothing dynamic here</p>",
          organizationId: orgId,
        }),
        "BAD_REQUEST"
      )

      const templates = await prisma.template.findMany({
        where: { organizationId: orgId },
      })
      expect(templates).toHaveLength(0)
    })

    it("accepts the placeholder anywhere in the content", async () => {
      const { user, orgId } = await createUser()

      const { template } = await createCaller({ id: user.id }).template.create({
        name: "Prefixed",
        content: "<header>Hi</header>{{content}}<footer>Bye</footer>",
        organizationId: orgId,
      })

      expect(template.content).toContain("{{content}}")
    })

    it("rejects an organization the caller is not a member of", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).template.create({
          name: "Intruder",
          content: CONTENT,
          organizationId: otherOrgId,
        }),
        "UNAUTHORIZED"
      )

      const templates = await prisma.template.findMany({
        where: { organizationId: otherOrgId },
      })
      expect(templates).toHaveLength(0)
    })

    it("rejects an unknown organization", async () => {
      const { user } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).template.create({
          name: "Nowhere",
          content: CONTENT,
          organizationId: faker.string.uuid(),
        }),
        "UNAUTHORIZED"
      )
    })
  })

  describe("get", () => {
    it("returns a template by id", async () => {
      const { user, orgId } = await createUser()
      const template = await createTemplate({
        organizationId: orgId,
        name: "Fetched",
      })

      const result = await createCaller({ id: user.id }).template.get({
        id: template.id,
        organizationId: orgId,
      })

      expect(result).toMatchObject({ id: template.id, name: "Fetched" })
    })

    it("throws NOT_FOUND for an unknown id", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).template.get({
          id: faker.string.uuid(),
          organizationId: orgId,
        }),
        "NOT_FOUND"
      )
    })

    it("does not return a template from another organization", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const template = await createTemplate({ organizationId: otherOrgId })

      await expectTrpcError(
        createCaller({ id: user.id }).template.get({
          id: template.id,
          organizationId: otherOrgId,
        }),
        "UNAUTHORIZED"
      )
    })

    it("throws NOT_FOUND when the id belongs to another organization", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const template = await createTemplate({ organizationId: otherOrgId })

      await expectTrpcError(
        createCaller({ id: user.id }).template.get({
          id: template.id,
          organizationId: orgId,
        }),
        "NOT_FOUND"
      )
    })
  })

  describe("list", () => {
    it("returns templates with pagination metadata", async () => {
      const { user, orgId } = await createUser()
      await createTemplate({ organizationId: orgId })
      await createTemplate({ organizationId: orgId })

      const result = await createCaller({ id: user.id }).template.list({
        organizationId: orgId,
        page: 1,
        perPage: 10,
      })

      expect(result.templates).toHaveLength(2)
      expect(result.pagination).toEqual({
        total: 2,
        totalPages: 1,
        page: 1,
        perPage: 10,
        hasMore: false,
      })
    })

    it("paginates without overlap", async () => {
      const { user, orgId } = await createUser()
      for (let i = 0; i < 5; i++) {
        await createTemplate({ organizationId: orgId, name: `T${i}` })
      }

      const caller = createCaller({ id: user.id })
      const first = await caller.template.list({
        organizationId: orgId,
        page: 1,
        perPage: 2,
      })
      const second = await caller.template.list({
        organizationId: orgId,
        page: 2,
        perPage: 2,
      })
      const third = await caller.template.list({
        organizationId: orgId,
        page: 3,
        perPage: 2,
      })

      expect(first.pagination).toMatchObject({
        total: 5,
        totalPages: 3,
        hasMore: true,
      })
      expect(second.pagination.hasMore).toBe(true)
      expect(third.pagination.hasMore).toBe(false)
      expect(third.templates).toHaveLength(1)

      const ids = [
        ...first.templates,
        ...second.templates,
        ...third.templates,
      ].map((t) => t.id)
      expect(new Set(ids).size).toBe(5)
    })

    it("orders newest first", async () => {
      const { user, orgId } = await createUser()
      const older = await createTemplate({ organizationId: orgId })
      const newer = await createTemplate({ organizationId: orgId })

      const result = await createCaller({ id: user.id }).template.list({
        organizationId: orgId,
      })

      expect(result.templates.map((t) => t.id)).toEqual([newer.id, older.id])
    })

    it("searches name and description case-insensitively", async () => {
      const { user, orgId } = await createUser()
      const byName = await createTemplate({
        organizationId: orgId,
        name: "Announcement",
      })
      const byDescription = await createTemplate({
        organizationId: orgId,
        name: "Other",
        description: "For ANNOUNCEment emails",
      })
      await createTemplate({ organizationId: orgId, name: "Unrelated" })

      const result = await createCaller({ id: user.id }).template.list({
        organizationId: orgId,
        search: "announcement",
      })

      expect(result.templates.map((t) => t.id).sort()).toEqual(
        [byName.id, byDescription.id].sort()
      )
    })

    it("excludes templates from other organizations", async () => {
      const { user, orgId } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      await createTemplate({ organizationId: orgId })
      await createTemplate({ organizationId: otherOrgId })

      const result = await createCaller({ id: user.id }).template.list({
        organizationId: orgId,
      })

      expect(result.pagination.total).toBe(1)
    })

    it("rejects perPage above 100", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).template.list({
          organizationId: orgId,
          perPage: 101,
        }),
        "BAD_REQUEST"
      )
    })

    it("rejects another organization", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).template.list({
          organizationId: otherOrgId,
        }),
        "UNAUTHORIZED"
      )
    })
  })

  describe("update", () => {
    it("updates name, description and content", async () => {
      const { user, orgId } = await createUser()
      const template = await createTemplate({ organizationId: orgId })

      const result = await createCaller({ id: user.id }).template.update({
        id: template.id,
        name: "Renamed",
        description: "New description",
        content: `<div>{{content}}</div>`,
        organizationId: orgId,
      })

      expect(result.template).toMatchObject({
        name: "Renamed",
        description: "New description",
        content: "<div>{{content}}</div>",
      })
    })

    it("rejects content without the placeholder", async () => {
      const { user, orgId } = await createUser()
      const template = await createTemplate({ organizationId: orgId })

      await expectTrpcError(
        createCaller({ id: user.id }).template.update({
          id: template.id,
          name: "Renamed",
          content: "<p>plain</p>",
          organizationId: orgId,
        }),
        "BAD_REQUEST"
      )

      const stored = await prisma.template.findUnique({
        where: { id: template.id },
      })
      expect(stored?.name).toBe(template.name)
    })

    it("throws NOT_FOUND for an unknown id", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).template.update({
          id: faker.string.uuid(),
          name: "Ghost",
          content: CONTENT,
          organizationId: orgId,
        }),
        "NOT_FOUND"
      )
    })

    it("leaves another organization's template untouched", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const template = await createTemplate({
        organizationId: otherOrgId,
        name: "Theirs",
      })

      await expectTrpcError(
        createCaller({ id: user.id }).template.update({
          id: template.id,
          name: "Hijacked",
          content: CONTENT,
          organizationId: otherOrgId,
        }),
        "UNAUTHORIZED"
      )

      const stored = await prisma.template.findUnique({
        where: { id: template.id },
      })
      expect(stored?.name).toBe("Theirs")
    })
  })

  describe("delete", () => {
    it("deletes a template", async () => {
      const { user, orgId } = await createUser()
      const template = await createTemplate({ organizationId: orgId })

      const result = await createCaller({ id: user.id }).template.delete({
        id: template.id,
        organizationId: orgId,
      })

      expect(result).toEqual({ success: true })
      expect(
        await prisma.template.findUnique({ where: { id: template.id } })
      ).toBeNull()
    })

    it("throws NOT_FOUND for an unknown id", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).template.delete({
          id: faker.string.uuid(),
          organizationId: orgId,
        }),
        "NOT_FOUND"
      )
    })

    it("leaves another organization's template in place", async () => {
      const { user } = await createUser()
      const { orgId: otherOrgId } = await createUser()
      const template = await createTemplate({ organizationId: otherOrgId })

      await expectTrpcError(
        createCaller({ id: user.id }).template.delete({
          id: template.id,
          organizationId: otherOrgId,
        }),
        "UNAUTHORIZED"
      )

      expect(
        await prisma.template.findUnique({ where: { id: template.id } })
      ).not.toBeNull()
    })
  })

  describe("authentication", () => {
    it.each([
      [
        "create",
        () =>
          createCaller().template.create({
            name: "n",
            content: CONTENT,
            organizationId: "org",
          }),
      ],
      [
        "update",
        () =>
          createCaller().template.update({
            id: "id",
            name: "n",
            content: CONTENT,
            organizationId: "org",
          }),
      ],
      [
        "delete",
        () =>
          createCaller().template.delete({ id: "id", organizationId: "org" }),
      ],
      [
        "get",
        () => createCaller().template.get({ id: "id", organizationId: "org" }),
      ],
      ["list", () => createCaller().template.list({ organizationId: "org" })],
    ])("%s requires authentication", async (_name, call) => {
      await expectTrpcError(call(), "UNAUTHORIZED")
    })
  })
})
