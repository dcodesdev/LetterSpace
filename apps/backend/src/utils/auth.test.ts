import jwt from "jsonwebtoken"
import { describe, expect, it } from "vitest"
import { env } from "../constants"
import {
  comparePasswords,
  generateToken,
  hashPassword,
  verifyToken,
} from "./auth"

describe("hashPassword / comparePasswords", () => {
  it("should round-trip a password", async () => {
    const password = "correct-horse-battery-staple"
    const hashed = await hashPassword(password)

    expect(hashed).not.toBe(password)
    await expect(comparePasswords(password, hashed)).resolves.toBe(true)
  })

  it("should reject a wrong password", async () => {
    const hashed = await hashPassword("one-password")

    await expect(comparePasswords("another-password", hashed)).resolves.toBe(
      false
    )
  })

  it("should produce a different hash for the same password", async () => {
    const password = "same-password"

    const first = await hashPassword(password)
    const second = await hashPassword(password)

    expect(first).not.toBe(second)
    await expect(comparePasswords(password, first)).resolves.toBe(true)
    await expect(comparePasswords(password, second)).resolves.toBe(true)
  })

  it("should reject when the hash is not a bcrypt hash", async () => {
    await expect(comparePasswords("password", "not-a-hash")).resolves.toBe(
      false
    )
  })
})

describe("generateToken / verifyToken", () => {
  it("should produce a payload with id, version, iat and exp", () => {
    const token = generateToken("user-id-1", 3)
    const payload = verifyToken(token) as jwt.JwtPayload

    expect(payload.id).toBe("user-id-1")
    expect(payload.version).toBe(3)
    expect(typeof payload.iat).toBe("number")
    expect(typeof payload.exp).toBe("number")
  })

  it("should expire 30 days after issuing", () => {
    const token = generateToken("user-id-1", 0)
    const payload = verifyToken(token) as jwt.JwtPayload

    const thirtyDays = 30 * 24 * 60 * 60
    expect(payload.exp! - payload.iat!).toBe(thirtyDays)
  })

  it("should throw on an expired token", () => {
    const token = jwt.sign({ id: "user-id-1", version: 0 }, env.JWT_SECRET, {
      expiresIn: "-1s",
    })

    expect(() => verifyToken(token)).toThrow(jwt.TokenExpiredError)
  })

  it("should throw on a token signed with another secret", () => {
    const token = jwt.sign({ id: "user-id-1", version: 0 }, "another-secret", {
      expiresIn: "30d",
    })

    expect(() => verifyToken(token)).toThrow(jwt.JsonWebTokenError)
  })

  it("should throw on a tampered payload", () => {
    const token = generateToken("user-id-1", 0)
    const [header, payload, signature] = token.split(".")

    const tampered = Buffer.from(
      JSON.stringify({ id: "user-id-2", version: 0 })
    ).toString("base64url")

    expect(() => verifyToken([header, tampered, signature].join("."))).toThrow(
      jwt.JsonWebTokenError
    )
    expect(payload).not.toBe(tampered)
  })

  it("should throw on a malformed token", () => {
    expect(() => verifyToken("not-a-token")).toThrow(jwt.JsonWebTokenError)
  })
})
