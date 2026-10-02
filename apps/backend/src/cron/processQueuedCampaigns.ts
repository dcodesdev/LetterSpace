import pMap from "p-map"
import { v4 as uuidV4 } from "uuid"
import { Prisma, Subscriber, SubscriberMetadata } from "../../prisma/client"
import { LinkTracker } from "../lib/LinkTracker"
import {
  PlaceholderDataKey,
  replacePlaceholders,
} from "../utils/placeholder-parser"
import { prisma } from "../utils/prisma"
import { cronJob } from "./cron.utils"

// TODO: Make this a config
const BATCH_SIZE = 100

async function getSubscribersForCampaign(
  campaignId: string,
  organizationId: string,
  selectedListIds: string[]
): Promise<Map<string, Subscriber & { Metadata: SubscriberMetadata[] }>> {
  if (selectedListIds.length === 0) {
    return new Map()
  }

  const subscribers = await prisma.subscriber.findMany({
    where: {
      organizationId,
      Messages: { none: { campaignId } },
      ListSubscribers: {
        some: {
          listId: { in: selectedListIds },
          unsubscribedAt: null,
        },
      },
    },
    take: BATCH_SIZE,
    include: {
      Metadata: true,
    },
  })

  if (!subscribers.length) return new Map()

  const subscribersMap = new Map<
    string,
    Subscriber & { Metadata: SubscriberMetadata[] }
  >()
  await pMap(subscribers, async (subscriber) => {
    subscribersMap.set(subscriber.id, subscriber)
  })

  return subscribersMap
}

const logged = new Set<string>()

type LogReason =
  | "noQueuedCampaigns"
  | "missingCampaignData"
  | "noSubscribers"
  | "missingCampaignContent"
  | "missingCampaignSubject"
  | "errorProcessingCampaign"

const logKey = (reason: LogReason, campaignId?: string) =>
  campaignId ? `${campaignId}:${reason}` : reason

const oneTimeLogger = (
  key: { reason: LogReason; campaignId?: string },
  ...messages: unknown[]
) => {
  const k = logKey(key.reason, key.campaignId)
  if (!logged.has(k)) {
    console.log(...messages)
    logged.add(k)
  }
}

const turnOnLogger = (key: { reason: LogReason; campaignId?: string }) => {
  logged.delete(logKey(key.reason, key.campaignId))
}

const moveToSending = (campaignId: string) =>
  prisma.campaign.updateMany({
    where: { id: campaignId, status: "CREATING" },
    data: { status: "SENDING" },
  })

export const processQueuedCampaigns = cronJob(
  "process-queued-campaigns",
  async () => {
    await prisma.campaign.updateMany({
      where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
      data: { status: "CREATING" },
    })

    const queuedCampaigns = await prisma.campaign.findMany({
      where: {
        status: "CREATING",
      },
      include: {
        CampaignLists: {
          select: { listId: true },
        },
        Organization: {
          include: {
            GeneralSettings: true,
            SmtpSettings: true,
          },
        },
        Template: true,
      },
    })

    const queuedIds = new Set(queuedCampaigns.map((c) => c.id))
    for (const key of logged) {
      const [campaignId, reason] = key.split(":")
      if (reason && campaignId && !queuedIds.has(campaignId)) {
        logged.delete(key)
      }
    }

    if (queuedCampaigns.length === 0) {
      oneTimeLogger(
        { reason: "noQueuedCampaigns" },
        "Cron job: No queued campaigns to process."
      )
      return
    }

    turnOnLogger({ reason: "noQueuedCampaigns" })

    for (const campaign of queuedCampaigns) {
      try {
        if (
          !campaign ||
          !campaign.content ||
          !campaign.subject ||
          !campaign.Organization ||
          !campaign.Organization.GeneralSettings?.baseURL
        ) {
          oneTimeLogger(
            { reason: "missingCampaignData", campaignId: campaign.id },
            `Cron job: Campaign ${campaign.id} is missing required data (content, subject, organization, or baseURL). Skipping.`
          )
          // Optionally, update status to FAILED or similar
          // await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'FAILED', statusReason: 'Missing critical data for processing' } });
          continue
        }

        turnOnLogger({ reason: "missingCampaignData", campaignId: campaign.id })

        const baseURL = campaign.Organization.GeneralSettings.baseURL.replace(
          /\/+$/,
          ""
        )

        const selectedListIds = campaign.CampaignLists.map((cl) => cl.listId)

        const allSubscribersMap = await getSubscribersForCampaign(
          campaign.id,
          campaign.organizationId,
          selectedListIds
        )
        if (allSubscribersMap.size === 0) {
          oneTimeLogger(
            { reason: "noSubscribers", campaignId: campaign.id },
            `Cron job: Campaign ${campaign.id} has no subscribers left. Moving to SENDING.`
          )
          await moveToSending(campaign.id)
          continue
        }

        turnOnLogger({ reason: "noSubscribers", campaignId: campaign.id })

        const subscribersToProcess = Array.from(allSubscribersMap.values())

        await prisma.$transaction(
          async (tx) => {
            const linkTracker = new LinkTracker(tx)
            const messagesToCreate: Prisma.MessageCreateManyInput[] = []

            for (const subscriber of subscribersToProcess) {
              const messageId = uuidV4()
              if (!campaign.content) {
                oneTimeLogger(
                  { reason: "missingCampaignContent", campaignId: campaign.id },
                  `Cron job: Campaign ${campaign.id} has no content. Skipping.`
                )
                continue
              }

              turnOnLogger({
                reason: "missingCampaignContent",
                campaignId: campaign.id,
              })

              const campaignContent = campaign.content
              let emailContent = campaign.Template
                ? campaign.Template.content.replace(
                    /{{content}}/g,
                    () => campaignContent
                  )
                : campaignContent

              if (!campaign.subject) {
                oneTimeLogger(
                  { reason: "missingCampaignSubject", campaignId: campaign.id },
                  `Cron job: Campaign ${campaign.id} has no subject. Skipping.`
                )
                continue
              }

              turnOnLogger({
                reason: "missingCampaignSubject",
                campaignId: campaign.id,
              })

              const placeholderData: Partial<
                Record<PlaceholderDataKey, string>
              > = {
                "subscriber.email": subscriber.email,
                "campaign.name": campaign.title,
                "campaign.subject": campaign.subject,
                "organization.name": campaign.Organization.name,
                unsubscribe_link: `${baseURL}/unsubscribe?sid=${subscriber.id}&cid=${campaign.id}&mid=${messageId}`,
                current_date: new Date().toLocaleDateString("en-CA"),
              }

              if (campaign.openTracking) {
                emailContent += `<img src="${baseURL}/img/${messageId}/img.png" alt="" width="1" height="1" style="display:none" />`
              }

              if (subscriber.name) {
                placeholderData["subscriber.name"] = subscriber.name
              }
              if (subscriber.Metadata) {
                for (const meta of subscriber.Metadata) {
                  placeholderData[`subscriber.metadata.${meta.key}`] =
                    meta.value
                }
              }

              emailContent = replacePlaceholders(emailContent, placeholderData)

              if (!baseURL) {
                console.error(
                  `Cron job: Campaign ${campaign.id} has no baseURL. Skipping.`
                )
                continue
              }

              const { content: finalContent } =
                await linkTracker.replaceMessageContentWithTrackedLinks(
                  emailContent,
                  campaign.id,
                  baseURL,
                  subscriber.id
                )

              messagesToCreate.push({
                id: messageId,
                campaignId: campaign.id,
                subscriberId: subscriber.id,
                content: finalContent,
                status: "QUEUED",
              })
            }

            if (messagesToCreate.length > 0) {
              await tx.message.createMany({
                data: messagesToCreate,
              })

              const subscribersLeft = await tx.subscriber.count({
                where: {
                  Messages: { none: { campaignId: campaign.id } },
                  ListSubscribers: {
                    some: {
                      listId: { in: selectedListIds },
                      unsubscribedAt: null,
                    },
                  },
                },
              })

              if (subscribersLeft === 0) {
                await tx.campaign.updateMany({
                  where: { id: campaign.id, status: "CREATING" },
                  data: { status: "SENDING" },
                })
              }

              console.log(
                `Cron job: Created ${messagesToCreate.length} messages for campaign ${campaign.id}.`
              )
            }
          },
          { timeout: 60_000 }
        ) // End transaction

        turnOnLogger({
          reason: "errorProcessingCampaign",
          campaignId: campaign.id,
        })
      } catch (error) {
        oneTimeLogger(
          { reason: "errorProcessingCampaign", campaignId: campaign.id },
          `Cron job: Error processing campaign ${campaign.id}:`,
          error
        )
        // Optionally, mark campaign as FAILED
        // await prisma.campaign.update({ where: { id: basicCampaignInfo.id }, data: { status: 'FAILED', statusReason: error.message }});
      }
    }
  }
)
