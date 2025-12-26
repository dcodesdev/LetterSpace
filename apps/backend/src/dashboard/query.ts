import { TRPCError } from "@trpc/server"
import { subMonths } from "date-fns"
import pMap from "p-map"
import { z } from "zod"
import { MessageStatus } from "../../prisma/client"
import { countDbSize, subscriberGrowthQuery } from "../../prisma/client/sql"
import { authProcedure } from "../trpc"
import { messageStatus } from "../utils/message-status"
import { prisma } from "../utils/prisma"

export const getDashboardStats = authProcedure
  .input(
    z.object({
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

    const from = subMonths(new Date(), 6)
    const to = new Date()

    const dateFilter = {
      ...(from && to
        ? {
            createdAt: {
              gte: from,
              lte: to,
            },
          }
        : {}),
    }

    const [
      messageStats,
      recentCampaigns,
      subscriberGrowth,
      [dbSize],
      baselineSubscriberCount,
    ] = await Promise.all([
      // Message delivery stats
      prisma.message.groupBy({
        by: ["status"],
        where: {
          Campaign: {
            organizationId: input.organizationId,
          },
          ...dateFilter,
        },
        _count: true,
      }),

      // Recent campaigns with stats
      prisma.campaign.findMany({
        where: {
          organizationId: input.organizationId,
          status: "COMPLETED",
          ...dateFilter,
        },
        include: {
          _count: {
            select: {
              Messages: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 5,
      }),

      // Subscriber growth over time
      prisma.$queryRawTyped(
        subscriberGrowthQuery(input.organizationId, from, to)
      ),

      prisma.$queryRawTyped(countDbSize(input.organizationId)),

      // Count of subscribers before the 6-month window (baseline)
      prisma.subscriber.count({
        where: {
          organizationId: input.organizationId,
          createdAt: {
            lt: from,
          },
        },
      }),
    ])

    // Process message stats
    const messageStatsByStatus = messageStats.reduce(
      (acc, stat) => {
        acc[stat.status as MessageStatus] = stat._count
        return acc
      },
      {} as Record<MessageStatus, number>
    )

    // Process recent campaigns
    const processedCampaigns = await pMap(recentCampaigns, async (campaign) => {
      const [deliveredCount, totalCount] = await Promise.all([
        prisma.message.count({
          where: {
            campaignId: campaign.id,
            status: {
              in: messageStatus.deliveredMessages,
            },
          },
        }),
        prisma.message.count({
          where: { campaignId: campaign.id },
        }),
      ])

      return {
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
        completedAt: campaign.completedAt,
        deliveryRate: totalCount > 0 ? (deliveredCount / totalCount) * 100 : 0,
        totalMessages: totalCount,
        sentMessages: deliveredCount,
        createdAt: campaign.createdAt,
      }
    })

    const subscriberGrowthCumulative: { date: Date; count: number }[] = []

    for (let i = 0; i < subscriberGrowth.length; i++) {
      const point = subscriberGrowth[i]

      if (!point?.date) {
        continue
      }

      const prev =
        subscriberGrowthCumulative[i - 1]?.count ?? baselineSubscriberCount

      subscriberGrowthCumulative.push({
        date: point.date,
        count: Number(point.count) + Number(prev),
      })
    }

    return {
      messageStats: messageStatsByStatus,
      recentCampaigns: processedCampaigns,
      subscriberGrowth: subscriberGrowthCumulative,
      dbSize,
    }
  })
