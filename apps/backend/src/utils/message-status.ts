import { MessageStatus } from "../../prisma/client"

export const messageStatus = {
  pendingMessages: ["QUEUED", "PENDING", "RETRYING"] as MessageStatus[],
  deliveredMessages: ["SENT", "OPENED", "CLICKED"] as MessageStatus[],
  openedMessages: ["OPENED", "CLICKED"] as MessageStatus[],
  processedMessages: [
    "SENT",
    "AWAITING_WEBHOOK",
    "OPENED",
    "CLICKED",
    "FAILED",
    "COMPLAINED",
  ] as MessageStatus[],
  completedMessages: [
    "SENT",
    "AWAITING_WEBHOOK",
    "OPENED",
    "CLICKED",
    "FAILED",
    "CANCELLED",
    "COMPLAINED",
  ] as MessageStatus[],
}
