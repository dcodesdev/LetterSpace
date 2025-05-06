import { z } from "zod"
import { authProcedure } from "../trpc"
import { prisma } from "../utils/prisma"
import { TRPCError } from "@trpc/server"
import pMap from "p-map"
import { LinkTracker } from "../lib/LinkTracker"
import { v4 as uuidV4 } from "uuid"
import { Mailer } from "../lib/Mailer"
import {
  replacePlaceholders,
  PlaceholderDataKey,
} from "../utils/placeholder-parser"

const createCampaignSchema = z.object({
  title: z.string().min(1, "Campaign title is required"),
  description: z.string().optional(),
  organizationId: z.string(),
})

export const createCampaign = authProcedure
  .input(createCampaignSchema)
  .mutation(async ({ ctx, input }) => {
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

    const campaign = await prisma.campaign.create({
      data: {
        title: input.title,
        description: input.description,
        organizationId: input.organizationId,
        status: "DRAFT",
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

    return { campaign }
  })

const updateCampaignSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  title: z.string().optional(),
  description: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  templateId: z.string().optional().nullable(),
  listIds: z.array(z.string()).optional(),
  scheduledAt: z.date().optional().nullable(),
  content: z.string().optional().nullable(),
  openTracking: z.boolean().optional(),
})

export const updateCampaign = authProcedure
  .input(updateCampaignSchema)
  .mutation(async ({ ctx, input }) => {
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
    })

    if (!campaign) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Campaign not found",
      })
    }

    if (campaign.status !== "DRAFT") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Campaign can not be updated!",
      })
    }

    // If a templateId is provided, ensure it exists
    if (input.templateId) {
      const template = await prisma.template.findFirst({
        where: {
          id: input.templateId,
          organizationId: input.organizationId,
        },
      })

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        })
      }
    }

    if (input.listIds?.length) {
      const lists = await prisma.list.findMany({
        where: {
          id: { in: input.listIds },
          organizationId: input.organizationId,
        },
      })

      if (lists.length !== input.listIds.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or more lists not found",
        })
      }
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id: input.id },
      data: {
        title: input.title,
        description: input.description,
        subject: input.subject,
        content: input.content,
        templateId: input.templateId,
        scheduledAt: input.scheduledAt,
        openTracking: input.openTracking,
        CampaignLists: {
          deleteMany: {},
          create: input.listIds?.map((listId) => ({
            listId,
          })),
        },
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

    return { campaign: updatedCampaign }
  })

export const deleteCampaign = authProcedure
  .input(
    z.object({
      id: z.string(),
      organizationId: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
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
    })

    if (!campaign) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Campaign not found",
      })
    }

    await prisma.campaign.delete({
      where: { id: input.id },
    })

    return { success: true }
  })

export const startCampaign = authProcedure
  .input(
    z.object({
      id: z.string(),
      organizationId: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
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

    const [smtpSettings, emailSettings] = await Promise.all([
      prisma.smtpSettings.findFirst({
        where: {
          organizationId: input.organizationId,
        },
      }),
      prisma.emailDeliverySettings.findFirst({
        where: {
          organizationId: input.organizationId,
        },
      }),
    ])

    if (!smtpSettings) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "You must configure your SMTP settings before running a campaign",
      })
    }

    if (!emailSettings) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "You must configure your email delivery settings before running a campaign",
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
            List: {
              include: {
                ListSubscribers: {
                  where: {
                    unsubscribedAt: null,
                  },
                  include: {
                    Subscriber: {
                      select: {
                        id: true,
                        email: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
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

    // Check campaign status
    if (campaign.status !== "DRAFT") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Campaign can only be started from DRAFT status",
      })
    }

    if (!campaign.subject) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Email Subject is required",
      })
    }

    // Check campaign has lists
    if (campaign.CampaignLists.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Campaign must have at least one list",
      })
    }

    if (!campaign.content) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Can not send an empty campaign. Write some content in the editor to start sending.",
      })
    }

    type Subscriber =
      (typeof campaign)["CampaignLists"][0]["List"]["ListSubscribers"][0]["Subscriber"]

    const subscribers = new Map<string, Subscriber>()
    await pMap(campaign.CampaignLists, (campaignList) => {
      return pMap(campaignList.List.ListSubscribers, (listSubscriber) => {
        subscribers.set(listSubscriber.Subscriber.id, listSubscriber.Subscriber)
      })
    })

    if (subscribers.size === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Campaign must have at least one recipient",
      })
    }

    const organization = await prisma.organization.findUnique({
      where: { id: input.organizationId },
      select: { name: true },
    })

    if (!organization) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Organization details could not be retrieved.",
      })
    }

    const generalSettings = await prisma.generalSettings.findFirst({
      where: {
        organizationId: input.organizationId,
      },
    })

    if (!generalSettings?.baseURL) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Base URL must be configured in settings before running a campaign",
      })
    }

    const updatedCampaign = await prisma.$transaction(async (tx) => {
      const status =
        campaign.scheduledAt && campaign.scheduledAt > new Date()
          ? "SCHEDULED"
          : "SENDING"

      const linkTracker = new LinkTracker(tx)

      const messagesData = await Promise.all(
        Array.from(subscribers.values()).map(async (subscriber) => {
          if (!campaign.content) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Campaign must have content",
            })
          }

          if (!generalSettings.baseURL) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Base URL must be configured in settings before running a campaign",
            })
          }

          const messageId = uuidV4()
          let content = campaign.Template
            ? campaign.Template.content.replace("{{content}}", campaign.content)
            : campaign.content

          const placeholderData: Partial<Record<PlaceholderDataKey, string>> = {
            "subscriber.email": subscriber.email,
            "campaign.name": campaign.title,
            "campaign.subject": campaign.subject ?? "",
            "organization.name": organization.name,
            unsubscribe_url: `${generalSettings.baseURL}/unsubscribe?sid=${subscriber.id}&cid=${campaign.id}`,
            current_date: new Date().toLocaleDateString("en-CA"),
          }

          if (campaign.openTracking) {
            content += `<img src="${generalSettings.baseURL}/img/${messageId}/img.png" alt="" width="1" height="1" style="display:none" />`
          }

          if (subscriber.name) {
            placeholderData["subscriber.name"] = subscriber.name
          }

          content = replacePlaceholders(content, placeholderData)

          const { content: finalContent, trackedIds } =
            await linkTracker.replaceMessageContentWithTrackedLinks(
              content,
              campaign.id,
              generalSettings.baseURL
            )

          return {
            message: {
              id: messageId,
              subscriberId: subscriber.id,
              content: finalContent,
            },
            subscriberTrackedLinks: trackedIds.map((trackedLinkId) => ({
              messageId,
              subscriberId: subscriber.id,
              trackedLinkId,
            })),
          }
        })
      )

      const createdCampaign = await tx.campaign.update({
        where: { id: campaign.id },
        data: {
          status,
          Messages: {
            create: messagesData.map(({ message }) => message),
          },
        },
        include: {
          Messages: true,
          _count: {
            select: {
              Messages: true,
            },
          },
        },
      })

      return createdCampaign
    })

    return { campaign: updatedCampaign }
  })

export const cancel = authProcedure
  .input(
    z.object({
      id: z.string(),
      organizationId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: input.id,
        organizationId: input.organizationId,
      },
    })

    if (!campaign) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Campaign not found",
      })
    }

    if (campaign.status !== "SENDING") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Campaign is not in sending state",
      })
    }

    await prisma.campaign.update({
      where: {
        id: input.id,
      },
      data: {
        status: "CANCELLED",
      },
    })

    return { success: true }
  })

export const sendTestEmail = authProcedure
  .input(
    z.object({
      campaignId: z.string(),
      organizationId: z.string(),
      email: z.string().email(),
    })
  )
  .mutation(async ({ ctx, input }) => {
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

    const settings = await prisma.smtpSettings.findFirst({
      where: {
        organizationId: input.organizationId,
      },
    })

    if (!settings) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "You must configure your SMTP settings before sending test emails",
      })
    }

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: input.campaignId,
        organizationId: input.organizationId,
      },
      include: {
        Template: true,
      },
    })

    if (!campaign) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Campaign not found",
      })
    }

    if (!campaign.content) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Campaign must have content",
      })
    }

    if (!campaign.subject) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Email Subject is required",
      })
    }

    const content = campaign.Template
      ? campaign.Template.content.replace("{{content}}", campaign.content)
      : campaign.content

    const mailer = new Mailer(settings)

    const result = await mailer.sendEmail({
      to: input.email,
      subject: `[Test] ${campaign.subject}`,
      html: content,
      from: `${settings.fromName} <${settings.fromEmail}>`,
    })

    if (!result.success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to send test email",
      })
    }

    return { success: true }
  })
