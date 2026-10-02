import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { Prisma } from "../../prisma/client"
import { authProcedure } from "../trpc"
import { messageStatus } from "../utils/message-status"
import { resolveProps } from "../utils/pProps"
import { prisma } from "../utils/prisma"
import { paginationSchema } from "../utils/schemas"

export const listCampaigns = authProcedure
  .input(z.object({ organizationId: z.string() }).merge(paginationSchema))
  .query(async ({ ctx, input }) => {
    const userOrganization = await prisma.userOrganization.findFirst({
      where: {
        userId: ctx.user.id,
        organizationId: input.organizationId,
      },
    })

    if (!userOrganization) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      })
    }

    const where: Prisma.CampaignWhereInput = {
      organizationId: input.organizationId,
      ...(input.search
        ? {
            OR: [
              { title: { contains: input.search, mode: "insensitive" } },
              { description: { contains: input.search, mode: "insensitive" } },
              { subject: { contains: input.search, mode: "insensitive" } },
            ],
          }
        : {}),
    }

    const [total, campaigns] = await prisma.$transaction([
      prisma.campaign.count({ where }),
      prisma.campaign.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (input.page - 1) * input.perPage,
        take: input.perPage,
        include: {
          Template: {
            select: {
              id: true,
              name: true,
            },
          },
          CampaignLists: {
            include: {
              List: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              Messages: true,
            },
          },
        },
      }),
    ])

    const totalPages = Math.ceil(total / input.perPage)

    return {
      campaigns,
      pagination: {
        total,
        totalPages,
        page: input.page,
        perPage: input.perPage,
        hasMore: input.page < totalPages,
      },
    }
  })

export const getCampaign = authProcedure
  .input(
    z.object({
      id: z.string(),
      organizationId: z.string(),
    })
  )
  .query(async ({ ctx, input }) => {
    const userOrganization = await prisma.userOrganization.findFirst({
      where: {
        userId: ctx.user.id,
        organizationId: input.organizationId,
      },
    })

    if (!userOrganization) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      })
    }

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: input.id,
        organizationId: input.organizationId,
      },
      include: {
        Template: true,
        CampaignLists: {
          include: {
            List: true,
          },
        },
      },
    })

    if (!campaign) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Campaign not found",
      })
    }

    const listIds = campaign.CampaignLists.map((cl) => cl.listId)

    const [uniqueRecipientCount, listCounts] = await Promise.all([
      prisma.subscriber.count({
        where: {
          ListSubscribers: {
            some: {
              listId: { in: listIds },
              unsubscribedAt: null,
            },
          },
        },
      }),
      prisma.listSubscriber.groupBy({
        by: ["listId"],
        where: {
          listId: { in: listIds },
          unsubscribedAt: null,
        },
        _count: true,
      }),
    ])

    const countByListId = new Map(
      listCounts.map((group) => [group.listId, group._count])
    )

    // Add the count to each list for backward compatibility
    const campaignWithCounts = {
      ...campaign,
      CampaignLists: campaign.CampaignLists.map((cl) => ({
        ...cl,
        List: {
          ...cl.List,
          _count: {
            ListSubscribers: countByListId.get(cl.listId) ?? 0,
          },
        },
      })),
      // Add the unique subscriber count directly to the campaign object
      uniqueRecipientCount,
    }

    const promises = {
      totalMessages: prisma.message.count({
        where: {
          campaignId: campaign.id,
        },
      }),
      queuedMessages: prisma.message.count({
        where: {
          campaignId: campaign.id,
          status: "QUEUED",
        },
      }),
      pendingMessages: prisma.message.count({
        where: {
          campaignId: campaign.id,
          status: "PENDING",
        },
      }),
      sentMessages: prisma.message.count({
        where: {
          campaignId: campaign.id,
          status: {
            in: messageStatus.deliveredMessages,
          },
        },
      }),
      failedMessages: prisma.message.count({
        where: {
          campaignId: campaign.id,
          status: "FAILED",
        },
      }),
      processed: prisma.message.count({
        where: {
          campaignId: campaign.id,
          status: {
            in: messageStatus.processedMessages,
          },
        },
      }),
      clicked: prisma.message.count({
        where: {
          campaignId: campaign.id,
          status: "CLICKED",
        },
      }),
      opened: prisma.message.count({
        where: {
          campaignId: campaign.id,
          status: {
            in: messageStatus.openedMessages,
          },
        },
      }),
    }

    const result = await resolveProps(promises)

    return {
      campaign: campaignWithCounts,
      stats: {
        totalMessages: result.totalMessages,
        queuedMessages: result.queuedMessages,
        pendingMessages: result.pendingMessages,
        sentMessages: result.sentMessages,
        failedMessages: result.failedMessages,
        processed: result.processed,
        clicked: result.clicked,
        opened: result.opened,
        clickRate:
          result.sentMessages > 0
            ? (result.clicked / result.sentMessages) * 100
            : 0,
        openRate:
          result.sentMessages > 0
            ? (result.opened / result.sentMessages) * 100
            : 0,
      },
    }
  })
