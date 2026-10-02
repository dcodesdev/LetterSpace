import jwt from "jsonwebtoken"
import { describe, expect, it } from "vitest"
import { generateToken } from "./auth"
import { tokenPayloadSchema } from "./token"

describe("tokenPayloadSchema", () => {
  const decode = (token: string) => jwt.decode(token) as jwt.JwtPayload

  it("should accept a real generated payload", () => {
    const payload = decode(generateToken("user-id-1", 2))

    const parsed = tokenPayloadSchema.parse(payload)

    expect(parsed).toEqual({
      id: "user-id-1",
      version: 2,
      iat: payload.iat,
      exp: payload.exp,
    })
  })

  it("should strip unknown keys", () => {
    const payload = { ...decode(generateToken("user-id-1", 0)), role: "admin" }

    expect(tokenPayloadSchema.parse(payload)).not.toHaveProperty("role")
  })

  it.each(["id", "version", "iat", "exp"])(
    "should reject a payload missing %s",
    (field) => {
      const payload: Record<string, unknown> = decode(
        generateToken("user-id-1", 0)
      )
      delete payload[field]

      expect(tokenPayloadSchema.safeParse(payload).success).toBe(false)
    }
  )

  it("should reject a string version", () => {
    const payload = { ...decode(generateToken("user-id-1", 0)), version: "1" }

    expect(tokenPayloadSchema.safeParse(payload).success).toBe(false)
  })

  it("should reject a non-string id", () => {
    const payload = { ...decode(generateToken("user-id-1", 0)), id: 1 }

    expect(tokenPayloadSchema.safeParse(payload).success).toBe(false)
  })

  it("should reject a non-object payload", () => {
    expect(tokenPayloadSchema.safeParse(null).success).toBe(false)
    expect(tokenPayloadSchema.safeParse("token").success).toBe(false)
  })
})
