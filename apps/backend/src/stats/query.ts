import { z } from "zod"
import { authProcedure } from "../trpc"
import { prisma } from "../utils/prisma"
import { subDays } from "date-fns"
import { TRPCError } from "@trpc/server"
import { resolveProps } from "../utils/pProps"
import {
  countDistinctRecipients,
  countDistinctRecipientsInTimeRange,
} from "../../prisma/client/sql"

export const getStats = authProcedure
  .input(
    z.object({
      organizationId: z.string(),
    })
  )
  .query(async ({ ctx, input }) => {
    const now = new Date()
    const thirtyDaysAgo = subDays(now, 30)
    const sixtyDaysAgo = subDays(now, 60)

    // Check auth
    const hasAccess = await prisma.userOrganization.findFirst({
      where: {
        userId: ctx.user.id,
        organizationId: input.organizationId,
      },
    })

    if (!hasAccess) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You do not have access to this organization",
      })
    }

    // We need to get this first for calculating the other stats
    const [totalMessages, totalMessagesLast30Days, totalMessagesLastPeriod] =
      await prisma.$transaction([
        prisma.message.count({
          where: {
            Campaign: {
              organizationId: input.organizationId,
            },
          },
        }),
        prisma.message.count({
          where: {
            Campaign: {
              organizationId: input.organizationId,
            },
            createdAt: {
              gte: thirtyDaysAgo,
              lt: now,
            },
          },
        }),
        prisma.message.count({
          where: {
            Campaign: {
              organizationId: input.organizationId,
            },
            createdAt: {
              gte: sixtyDaysAgo,
              lt: thirtyDaysAgo,
            },
          },
        }),
      ])

    const promises = {
      allTimeSubscribers: prisma.subscriber.count({
        where: {
          organizationId: input.organizationId,
        },
      }),
      newSubscribersThisMonth: prisma.subscriber.count({
        where: {
          organizationId: input.organizationId,
          createdAt: {
            gte: thirtyDaysAgo,
            lt: now,
          },
        },
      }),
      openRateThisMonth: (async () => {
        const openedMessages = await prisma.message.count({
          where: {
            status: {
              in: ["CLICKED", "OPENED"],
            },
            Campaign: {
              organizationId: input.organizationId,
            },
            sentAt: {
              gte: thirtyDaysAgo,
              lt: now,
            },
          },
        })

        return openedMessages / (totalMessagesLast30Days || 1)
      })(),
      openRateLastMonth: (async () => {
        const openedMessages = await prisma.message.count({
          where: {
            status: {
              in: ["CLICKED", "OPENED"],
            },
            Campaign: {
              organizationId: input.organizationId,
            },
            sentAt: {
              gte: sixtyDaysAgo,
              lt: thirtyDaysAgo,
            },
          },
        })

        return openedMessages / (totalMessagesLastPeriod || 1)
      })(),
      unsubscribedThisMonth: prisma.listSubscriber.count({
        where: {
          List: {
            organizationId: input.organizationId,
          },
          unsubscribedAt: {
            not: null,
            gte: thirtyDaysAgo,
            lt: now,
          },
        },
      }),
      unsubscribedLastMonth: prisma.listSubscriber.count({
        where: {
          List: {
            organizationId: input.organizationId,
          },
          unsubscribedAt: {
            not: null,
            gte: sixtyDaysAgo,
            lt: thirtyDaysAgo,
          },
        },
      }),
      totalCampaigns: prisma.campaign.count({
        where: {
          organizationId: input.organizationId,
        },
      }),
      totalCampaignsThisMonth: prisma.campaign.count({
        where: {
          organizationId: input.organizationId,
          createdAt: {
            gte: thirtyDaysAgo,
            lt: now,
          },
        },
      }),
      totalCampaignsLastMonth: prisma.campaign.count({
        where: {
          organizationId: input.organizationId,
          createdAt: {
            gte: sixtyDaysAgo,
            lt: thirtyDaysAgo,
          },
        },
      }),
      completedCampaigns: prisma.campaign.count({
        where: {
          organizationId: input.organizationId,
          status: "COMPLETED",
        },
      }),
      completedCampaignsThisMonth: prisma.campaign.count({
        where: {
          organizationId: input.organizationId,
          status: "COMPLETED",
        },
      }),
      completedCampaignsLastMonth: prisma.campaign.count({
        where: {
          organizationId: input.organizationId,
          status: "COMPLETED",
        },
      }),
      deliveryRateThisMonth: (async () => {
        const deliveredMessages = await prisma.message.count({
          where: {
            status: {
              in: ["SENT", "CLICKED", "OPENED"],
            },
            Campaign: {
              organizationId: input.organizationId,
            },
            createdAt: {
              gte: thirtyDaysAgo,
              lt: now,
            },
          },
        })

        return {
          delivered: deliveredMessages,
          rate: deliveredMessages / (totalMessagesLast30Days || 1),
        }
      })(),
      deliveryRateLastMonth: (async () => {
        const deliveredMessages = await prisma.message.count({
          where: {
            status: {
              in: ["SENT", "CLICKED", "OPENED"],
            },
            Campaign: {
              organizationId: input.organizationId,
            },
            createdAt: {
              gte: sixtyDaysAgo,
              lt: thirtyDaysAgo,
            },
          },
        })

        return {
          delivered: deliveredMessages,
          rate: deliveredMessages / (totalMessagesLastPeriod || 1),
        }
      })(),
      clickRateThisMonth: (async () => {
        const clickedMessages = await prisma.message.count({
          where: {
            status: "CLICKED",
            Campaign: {
              organizationId: input.organizationId,
            },
            createdAt: {
              gte: thirtyDaysAgo,
              lt: now,
            },
          },
        })

        return {
          clicked: clickedMessages,
          rate: clickedMessages / (totalMessagesLast30Days || 1),
        }
      })(),
      clickRateLastMonth: (async () => {
        const clickedMessages = await prisma.message.count({
          where: {
            status: "CLICKED",
            Campaign: {
              organizationId: input.organizationId,
            },
            createdAt: {
              gte: sixtyDaysAgo,
              lt: thirtyDaysAgo,
            },
          },
        })

        return {
          clicked: clickedMessages,
          rate: clickedMessages / (totalMessagesLastPeriod || 1),
        }
      })(),
      recipients: prisma.$queryRawTyped(
        countDistinctRecipients(input.organizationId)
      ),
      recipientsThisMonth: prisma.$queryRawTyped(
        countDistinctRecipientsInTimeRange(
          input.organizationId,
          thirtyDaysAgo,
          now
        )
      ),
      recipientsLastMonth: prisma.$queryRawTyped(
        countDistinctRecipientsInTimeRange(
          input.organizationId,
          sixtyDaysAgo,
          thirtyDaysAgo
        )
      ),
    }

    const result = await resolveProps(promises)

    const data = {
      campaigns: {
        total: result.totalCampaigns,
        thisMonth: result.totalCampaignsThisMonth,
        lastMonth: result.totalCampaignsLastMonth,
        comparison: result.totalCampaigns - result.totalCampaignsLastMonth,
      },
      completedCampaigns: {
        total: result.completedCampaigns,
        thisMonth: result.completedCampaignsThisMonth,
        lastMonth: result.completedCampaignsLastMonth,
        comparison:
          result.completedCampaigns - result.completedCampaignsLastMonth,
      },
      openRate: {
        thisMonth: result.openRateThisMonth * 100,
        lastMonth: result.openRateLastMonth * 100,
        comparison: (result.openRateThisMonth - result.openRateLastMonth) * 100,
      },
      clickRate: {
        thisMonth: {
          clicked: result.clickRateThisMonth.clicked,
          rate: result.clickRateThisMonth.rate * 100,
        },
        lastMonth: {
          clicked: result.clickRateLastMonth.clicked,
          rate: result.clickRateLastMonth.rate * 100,
        },
        comparison:
          (result.clickRateThisMonth.rate - result.clickRateLastMonth.rate) *
          100,
      },
      messages: {
        total: totalMessages,
        Last30Days: totalMessagesLast30Days,
        lastPeriod: totalMessagesLastPeriod,
      },
      recipients: {
        allTime: result.recipients[0]?.count || 0,
        thisMonth: result.recipientsThisMonth[0]?.count || 0,
        lastMonth: result.recipientsLastMonth[0]?.count || 0,
        comparison:
          Number(result.recipientsThisMonth[0]?.count) -
          Number(result.recipientsLastMonth[0]?.count),
      },
      deliveryRate: {
        thisMonth: {
          delivered: result.deliveryRateThisMonth.delivered,
          rate: result.deliveryRateThisMonth.rate * 100,
        },
        lastMonth: {
          delivered: result.deliveryRateLastMonth.delivered,
          rate: result.deliveryRateLastMonth.rate * 100,
        },
        comparison:
          (result.deliveryRateThisMonth.rate -
            result.deliveryRateLastMonth.rate) *
          100,
      },
      subscribers: {
        allTime: result.allTimeSubscribers,
        newThisMonth: result.newSubscribersThisMonth,
      },
      unsubscribed: {
        thisMonth: result.unsubscribedThisMonth,
        lastMonth: result.unsubscribedLastMonth,
        comparison: result.unsubscribedThisMonth - result.unsubscribedLastMonth,
      },
    }

    return data
  })
