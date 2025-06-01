import { MessageStatus } from "../../prisma/client"

export const messageStatus = {
  pendingMessages: ["QUEUED", "PENDING", "RETRYING"] as MessageStatus[],
  completedMessages: [
    "SENT",
    "OPENED",
    "CLICKED",
    "FAILED",
    "CANCELLED",
    "COMPLAINED",
  ] as MessageStatus[],
}
