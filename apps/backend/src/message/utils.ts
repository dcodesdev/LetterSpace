import { prisma } from "../utils/prisma"
import { MessageStatus } from "../../prisma/client"
import { messageStatus } from "../utils/message-status"

interface MessageQueryOptions {
  campaignId?: string
  organizationId: string
  status: MessageStatus | MessageStatus[]
}

export async function findMessagesByStatus({
  campaignId,
  organizationId,
  status,
}: MessageQueryOptions) {
  return prisma.message.findMany({
    where: {
      ...(campaignId && { campaignId }),
      Campaign: {
        organizationId,
      },
      status: Array.isArray(status) ? { in: status } : status,
    },
  })
}

interface CampaignMessagesQueryOptions {
  campaignId: string
  organizationId: string
}

export async function getDeliveredMessages({
  campaignId,
  organizationId,
}: CampaignMessagesQueryOptions) {
  return findMessagesByStatus({
    campaignId,
    organizationId,
    status: messageStatus.deliveredMessages,
  })
}

export async function getFailedMessages({
  campaignId,
  organizationId,
}: CampaignMessagesQueryOptions) {
  return findMessagesByStatus({
    campaignId,
    organizationId,
    status: "FAILED",
  })
}

export async function getOpenedMessages({
  campaignId,
  organizationId,
}: CampaignMessagesQueryOptions) {
  return findMessagesByStatus({
    campaignId,
    organizationId,
    status: messageStatus.openedMessages,
  })
}

export async function getClickedMessages({
  campaignId,
  organizationId,
}: CampaignMessagesQueryOptions) {
  return findMessagesByStatus({
    campaignId,
    organizationId,
    status: "CLICKED",
  })
}

export async function getQueuedMessages({
  campaignId,
  organizationId,
}: CampaignMessagesQueryOptions) {
  return findMessagesByStatus({
    campaignId,
    organizationId,
    status: "QUEUED",
  })
}
