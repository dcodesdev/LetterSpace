import { faker } from "@faker-js/faker"
import { createAuthedUser } from "@helpers/auth"
import { USER_PASSWORD, createUser } from "@helpers/factories"
import {
  createCaller,
  createCallerFromToken,
  expectTrpcError,
} from "@helpers/trpc"
import { verifyToken } from "@src/utils/auth"
import { prisma } from "@src/utils/prisma"
import { tokenPayloadSchema } from "@src/utils/token"
import { describe, expect, it } from "vitest"

describe("trpc user router", () => {
  describe("isFirstUser", () => {
    it("is true on an empty database", async () => {
      expect(await createCaller().user.isFirstUser()).toBe(true)
    })

    it("is false once a user exists", async () => {
      await createUser()
      expect(await createCaller().user.isFirstUser()).toBe(false)
    })
  })

  describe("signup", () => {
    it("creates the first user and returns a usable token", async () => {
      const email = faker.internet.email().toLowerCase()

      const { token } = await createCaller().user.signup({
        email,
        password: "password123",
        name: "First User",
      })

      const user = await prisma.user.findUniqueOrThrow({
        where: { email },
        omit: { pwdVersion: false },
      })

      const payload = tokenPayloadSchema.parse(verifyToken(token))
      expect(payload).toMatchObject({ id: user.id, version: user.pwdVersion })
    })

    it("stores a hashed password, not the plaintext", async () => {
      const email = faker.internet.email().toLowerCase()
      await createCaller().user.signup({
        email,
        password: "password123",
        name: "First User",
      })

      const user = await prisma.user.findUniqueOrThrow({
        where: { email },
        omit: { password: false },
      })

      expect(user.password).not.toBe("password123")
      expect(user.password.startsWith("$2")).toBe(true)
    })

    it("rejects a second signup once any user exists", async () => {
      await createUser()

      await expectTrpcError(
        createCaller().user.signup({
          email: faker.internet.email(),
          password: "password123",
          name: "Second User",
        }),
        "BAD_REQUEST"
      )
    })

    it.each([
      ["invalid email", { email: "not-an-email", password: "x", name: "n" }],
      ["empty password", { email: "a@b.com", password: "", name: "n" }],
      ["empty name", { email: "a@b.com", password: "x", name: "" }],
    ])("rejects %s", async (_label, input) => {
      await expectTrpcError(createCaller().user.signup(input), "BAD_REQUEST")
    })
  })

  describe("login", () => {
    it("returns a token and the user for valid credentials", async () => {
      const { user } = await createUser()

      const result = await createCaller().user.login({
        email: user.email,
        password: USER_PASSWORD,
      })

      const payload = tokenPayloadSchema.parse(verifyToken(result.token))
      expect(payload.id).toBe(user.id)
      expect(result.user.id).toBe(user.id)
      expect(result.user.UserOrganizations).toHaveLength(1)
    })

    it("rejects a wrong password", async () => {
      const { user } = await createUser()

      await expectTrpcError(
        createCaller().user.login({
          email: user.email,
          password: "wrong-password",
        }),
        "FORBIDDEN"
      )
    })

    it("rejects an unknown email", async () => {
      await expectTrpcError(
        createCaller().user.login({
          email: "nobody@example.com",
          password: USER_PASSWORD,
        }),
        "FORBIDDEN"
      )
    })
  })

  describe("me", () => {
    it("returns the current user with their organizations", async () => {
      const { user, orgId } = await createUser()

      const me = await createCaller({ id: user.id }).user.me()

      expect(me.id).toBe(user.id)
      expect(me.email).toBe(user.email)
      expect(me.UserOrganizations[0]?.Organization.id).toBe(orgId)
    })

    it("does not leak the password hash", async () => {
      const { user } = await createUser()
      const me = await createCaller({ id: user.id }).user.me()
      expect(me).not.toHaveProperty("password")
    })

    it("throws UNAUTHORIZED when the user no longer exists", async () => {
      await expectTrpcError(
        createCaller({ id: faker.string.uuid() }).user.me(),
        "UNAUTHORIZED"
      )
    })
  })

  describe("updateProfile", () => {
    it("updates the name and lowercases the email", async () => {
      const { user } = await createUser()

      const { user: updated } = await createCaller({
        id: user.id,
      }).user.updateProfile({
        name: "Renamed",
        email: "MiXeD.Case@Example.COM",
      })

      expect(updated.name).toBe("Renamed")
      expect(updated.email).toBe("mixed.case@example.com")

      const stored = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      })
      expect(stored.email).toBe("mixed.case@example.com")
    })

    it("allows keeping the same email", async () => {
      const { user } = await createUser()

      const { user: updated } = await createCaller({
        id: user.id,
      }).user.updateProfile({
        name: "Same Email",
        email: user.email.toLowerCase(),
      })

      expect(updated.email).toBe(user.email.toLowerCase())
    })

    it("rejects an email already used by another account", async () => {
      const { user } = await createUser()
      const other = await prisma.user.create({
        data: {
          name: "Other",
          email: "taken@example.com",
          password: "hash",
        },
      })

      await expectTrpcError(
        createCaller({ id: user.id }).user.updateProfile({
          name: "Whoever",
          email: other.email,
        }),
        "BAD_REQUEST"
      )
    })

    it("requires authentication", async () => {
      await expectTrpcError(
        createCaller().user.updateProfile({
          name: "Nope",
          email: "nope@example.com",
        }),
        "UNAUTHORIZED"
      )
    })
  })

  describe("changePassword", () => {
    it("bumps pwdVersion and invalidates the old token", async () => {
      const { user, token } = await createAuthedUser()

      const before = await createCallerFromToken(token)
      expect((await before.user.me()).id).toBe(user.id)

      const result = await createCaller({ id: user.id }).user.changePassword({
        currentPassword: USER_PASSWORD,
        newPassword: "new-password-123",
      })

      expect(result.success).toBe(true)

      const stored = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        omit: { pwdVersion: false },
      })
      expect(stored.pwdVersion).toBe(user.pwdVersion + 1)

      const stale = await createCallerFromToken(token)
      await expectTrpcError(stale.user.me(), "UNAUTHORIZED")

      const fresh = await createCallerFromToken(result.token)
      expect((await fresh.user.me()).id).toBe(user.id)
    })

    it("lets the user log in with the new password only", async () => {
      const { user } = await createUser()

      await createCaller({ id: user.id }).user.changePassword({
        currentPassword: USER_PASSWORD,
        newPassword: "new-password-123",
      })

      await expect(
        createCaller().user.login({
          email: user.email,
          password: "new-password-123",
        })
      ).resolves.toMatchObject({ user: { id: user.id } })

      await expectTrpcError(
        createCaller().user.login({
          email: user.email,
          password: USER_PASSWORD,
        }),
        "FORBIDDEN"
      )
    })

    it("rejects an incorrect current password", async () => {
      const { user } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).user.changePassword({
          currentPassword: "not-the-password",
          newPassword: "new-password-123",
        }),
        "BAD_REQUEST"
      )
    })

    it("rejects a new password shorter than 8 characters", async () => {
      const { user } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).user.changePassword({
          currentPassword: USER_PASSWORD,
          newPassword: "short",
        }),
        "BAD_REQUEST"
      )
    })

    it("requires authentication", async () => {
      await expectTrpcError(
        createCaller().user.changePassword({
          currentPassword: USER_PASSWORD,
          newPassword: "new-password-123",
        }),
        "UNAUTHORIZED"
      )
    })
  })
})
