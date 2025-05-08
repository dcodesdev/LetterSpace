import { z } from "zod"
import { authProcedure } from "../trpc"
import { prisma } from "../utils/prisma"
import { TRPCError } from "@trpc/server"
import { paginationSchema } from "../utils/schemas"
import { Prisma } from "../../prisma/client"
import { resolveProps } from "../utils/pProps"

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

    let uniqueSubscriberCount = 0

    // Only run the query if there are lists associated with the campaign
    if (campaign.CampaignLists.length > 0) {
      // Fetch unique subscriber count across all lists in the campaign
      const [{ count } = {}] = await prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(DISTINCT s.id) as count
        FROM "Subscriber" s
        JOIN "ListSubscriber" ls ON s.id = ls."subscriberId"
        WHERE ls."listId" IN (${Prisma.join(campaign.CampaignLists.map((cl) => cl.listId))})
        AND ls."unsubscribedAt" IS NULL
      `

      uniqueSubscriberCount = count ?? 0
    }

    // Add the count to each list for backward compatibility
    const campaignWithCounts = {
      ...campaign,
      CampaignLists: await Promise.all(
        campaign.CampaignLists.map(async (cl) => {
          const count = await prisma.listSubscriber.count({
            where: {
              listId: cl.listId,
              unsubscribedAt: null,
            },
          })

          return {
            ...cl,
            List: {
              ...cl.List,
              _count: {
                ListSubscribers: count,
              },
            },
          }
        })
      ),
      // Add the unique subscriber count directly to the campaign object
      uniqueRecipientCount: Number(uniqueSubscriberCount),
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
            in: ["SENT", "OPENED", "CLICKED"],
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
            not: "QUEUED",
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
            in: ["OPENED", "CLICKED"],
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
