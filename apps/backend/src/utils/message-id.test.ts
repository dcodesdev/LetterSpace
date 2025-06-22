import { describe, it, expect } from "vitest"
import { stripAngleBrackets } from "./message-id"

describe("stripAngleBrackets", () => {
  it("should remove angle brackets from both ends", () => {
    const messageId = "<abc123@smtp.server.com>"
    const result = stripAngleBrackets(messageId)
    expect(result).toBe("abc123@smtp.server.com")
  })

  it("should remove only opening angle bracket", () => {
    const messageId = "<abc123@smtp.server.com"
    const result = stripAngleBrackets(messageId)
    expect(result).toBe("abc123@smtp.server.com")
  })

  it("should remove only closing angle bracket", () => {
    const messageId = "abc123@smtp.server.com>"
    const result = stripAngleBrackets(messageId)
    expect(result).toBe("abc123@smtp.server.com")
  })

  it("should handle message ID without angle brackets", () => {
    const messageId = "abc123@smtp.server.com"
    const result = stripAngleBrackets(messageId)
    expect(result).toBe("abc123@smtp.server.com")
  })

  it("should handle empty string", () => {
    const messageId = ""
    const result = stripAngleBrackets(messageId)
    expect(result).toBe("")
  })

  it("should handle string with only angle brackets", () => {
    const messageId = "<>"
    const result = stripAngleBrackets(messageId)
    expect(result).toBe("")
  })

  it("should handle string with only opening bracket", () => {
    const messageId = "<"
    const result = stripAngleBrackets(messageId)
    expect(result).toBe("")
  })

  it("should handle string with only closing bracket", () => {
    const messageId = ">"
    const result = stripAngleBrackets(messageId)
    expect(result).toBe("")
  })

  it("should not remove angle brackets from middle of string", () => {
    const messageId = "<abc<def>ghi@smtp.server.com>"
    const result = stripAngleBrackets(messageId)
    expect(result).toBe("abc<def>ghi@smtp.server.com")
  })

  it("should handle complex message ID formats", () => {
    const messageId = "<20240101120000.ABC123@mail.example.com>"
    const result = stripAngleBrackets(messageId)
    expect(result).toBe("20240101120000.ABC123@mail.example.com")
  })

  it("should handle message ID with UUID format", () => {
    const messageId = "<550e8400-e29b-41d4-a716-446655440000@smtp.provider.com>"
    const result = stripAngleBrackets(messageId)
    expect(result).toBe(
      "550e8400-e29b-41d4-a716-446655440000@smtp.provider.com"
    )
  })

  it("should handle multiple consecutive angle brackets", () => {
    const messageId = "<<abc123@smtp.server.com>>"
    const result = stripAngleBrackets(messageId)
    expect(result).toBe("<abc123@smtp.server.com>")
  })
})
