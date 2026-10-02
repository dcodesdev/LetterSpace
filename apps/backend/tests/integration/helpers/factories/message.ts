import type { MessageStatus } from "@prisma-client"
import { prisma } from "@src/utils/prisma"

type MessageOptions = {
  campaignId: string
  subscriberId: string
  status?: MessageStatus
  content?: string
  sentAt?: Date
  messageId?: string
  createdAt?: Date
  tries?: number
  lastTriedAt?: Date
  error?: string
}

export const createMessage = async (data: MessageOptions) => {
  return prisma.message.create({
    data: {
      campaignId: data.campaignId,
      subscriberId: data.subscriberId,
      status: data.status,
      content: data.content ?? "<p>Hello</p>",
      sentAt: data.sentAt,
      messageId: data.messageId,
      createdAt: data.createdAt,
      tries: data.tries,
      lastTriedAt: data.lastTriedAt,
      error: data.error,
    },
  })
}
