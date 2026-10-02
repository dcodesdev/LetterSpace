import { faker } from "@faker-js/faker"
import { createUser } from "@helpers/factories"
import { createCaller, expectTrpcError } from "@helpers/trpc"
import { prisma } from "@src/utils/prisma"
import { describe, expect, it } from "vitest"

describe("trpc organization router", () => {
  describe("create", () => {
    it("creates an organization owned by the caller", async () => {
      const { user } = await createUser()

      const { organization } = await createCaller({
        id: user.id,
      }).organization.create({
        name: "Acme Inc",
        description: "A test organization",
      })

      expect(organization).toMatchObject({
        name: "Acme Inc",
        description: "A test organization",
      })

      const membership = await prisma.userOrganization.findFirst({
        where: { userId: user.id, organizationId: organization.id },
      })
      expect(membership).not.toBeNull()
    })

    it("seeds the default newsletter template and settings", async () => {
      const { user } = await createUser()

      const { organization } = await createCaller({
        id: user.id,
      }).organization.create({ name: "Seeded Org" })

      const [templates, general, delivery] = await Promise.all([
        prisma.template.findMany({
          where: { organizationId: organization.id },
        }),
        prisma.generalSettings.findUnique({
          where: { organizationId: organization.id },
        }),
        prisma.emailDeliverySettings.findUnique({
          where: { organizationId: organization.id },
        }),
      ])

      expect(templates).toHaveLength(1)
      expect(templates[0]?.name).toBe("Newsletter")
      expect(templates[0]?.content.length).toBeGreaterThan(0)
      expect(general).not.toBeNull()
      expect(delivery).not.toBeNull()
    })

    it("allows an optional description", async () => {
      const { user } = await createUser()

      const { organization } = await createCaller({
        id: user.id,
      }).organization.create({ name: "No Description" })

      expect(organization.description).toBeNull()
    })

    it("rejects an empty name", async () => {
      const { user } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).organization.create({ name: "" }),
        "BAD_REQUEST"
      )
    })

    it("requires authentication", async () => {
      await expectTrpcError(
        createCaller().organization.create({ name: "Anon Org" }),
        "UNAUTHORIZED"
      )
    })
  })

  describe("getById", () => {
    it("returns an organization the user belongs to", async () => {
      const { user, orgId } = await createUser()

      const organization = await createCaller({
        id: user.id,
      }).organization.getById({ id: orgId })

      expect(organization.id).toBe(orgId)
      expect(organization.name).toEqual(expect.any(String))
    })

    it("rejects reading another user's organization", async () => {
      const { user } = await createUser()
      const other = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).organization.getById({
          id: other.orgId,
        }),
        "UNAUTHORIZED"
      )
    })

    it("rejects an unknown organization id", async () => {
      const { user } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).organization.getById({
          id: faker.string.uuid(),
        }),
        "UNAUTHORIZED"
      )
    })

    it("requires authentication", async () => {
      const { orgId } = await createUser()

      await expectTrpcError(
        createCaller().organization.getById({ id: orgId }),
        "UNAUTHORIZED"
      )
    })
  })

  describe("update", () => {
    it("updates the name and description", async () => {
      const { user, orgId } = await createUser()

      const { organization } = await createCaller({
        id: user.id,
      }).organization.update({
        id: orgId,
        name: "Renamed Org",
        description: "New description",
      })

      expect(organization).toMatchObject({
        id: orgId,
        name: "Renamed Org",
        description: "New description",
      })

      const stored = await prisma.organization.findUniqueOrThrow({
        where: { id: orgId },
      })
      expect(stored.name).toBe("Renamed Org")
    })

    it("rejects updating another user's organization", async () => {
      const { user } = await createUser()
      const other = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).organization.update({
          id: other.orgId,
          name: "Hijacked",
        }),
        "UNAUTHORIZED"
      )

      const stored = await prisma.organization.findUniqueOrThrow({
        where: { id: other.orgId },
      })
      expect(stored.name).not.toBe("Hijacked")
    })

    it("rejects an empty name", async () => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).organization.update({
          id: orgId,
          name: "",
        }),
        "BAD_REQUEST"
      )
    })

    it("requires authentication", async () => {
      const { orgId } = await createUser()

      await expectTrpcError(
        createCaller().organization.update({ id: orgId, name: "Anon" }),
        "UNAUTHORIZED"
      )
    })
  })
})
