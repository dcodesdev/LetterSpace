import { MessageStatus } from "@prisma-client"
import { describe, expect, it } from "vitest"
import { messageStatus } from "./message-status"

const allStatuses = Object.values(MessageStatus)

describe("messageStatus", () => {
  it("should only reference statuses that exist in the Prisma enum", () => {
    for (const [group, statuses] of Object.entries(messageStatus)) {
      for (const status of statuses) {
        expect(allStatuses, `${group} contains unknown ${status}`).toContain(
          status
        )
      }
    }
  })

  it("should not repeat a status within a group", () => {
    for (const [group, statuses] of Object.entries(messageStatus)) {
      expect(new Set(statuses).size, `${group} has duplicates`).toBe(
        statuses.length
      )
    }
  })

  it("should cover every enum member across pending and completed", () => {
    const covered = new Set([
      ...messageStatus.pendingMessages,
      ...messageStatus.completedMessages,
    ])

    expect([...covered].sort()).toEqual([...allStatuses].sort())
  })

  it("should keep pending and completed disjoint", () => {
    const pending = new Set<string>(messageStatus.pendingMessages)

    for (const status of messageStatus.completedMessages) {
      expect(pending.has(status)).toBe(false)
    }
  })

  it("should treat opened messages as a subset of delivered", () => {
    for (const status of messageStatus.openedMessages) {
      expect(messageStatus.deliveredMessages).toContain(status)
    }
  })

  it("should treat delivered messages as a subset of processed", () => {
    for (const status of messageStatus.deliveredMessages) {
      expect(messageStatus.processedMessages).toContain(status)
    }
  })

  it("should treat processed messages as a subset of completed", () => {
    for (const status of messageStatus.processedMessages) {
      expect(messageStatus.completedMessages).toContain(status)
    }
  })

  it("should classify the terminal statuses", () => {
    expect(messageStatus.pendingMessages).toEqual([
      "QUEUED",
      "PENDING",
      "RETRYING",
    ])
    expect(messageStatus.completedMessages).toContain("CANCELLED")
    expect(messageStatus.processedMessages).not.toContain("CANCELLED")
  })
})
