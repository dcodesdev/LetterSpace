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
  selectedListIds: string[]
): Promise<Map<string, Subscriber & { Metadata: SubscriberMetadata[] }>> {
  if (selectedListIds.length === 0) {
    return new Map()
  }

  const subscribers = await prisma.subscriber.findMany({
    where: {
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

const logged = {
  noQueuedCampaigns: false,
  missingCampaignData: false,
  noSubscribers: false,
  missingCampaignContent: false,
  missingCampaignSubject: false,
  errorProcessingCampaign: false,
}

const oneTimeLogger = (key: keyof typeof logged, ...messages: unknown[]) => {
  if (!logged[key]) {
    console.log(...messages)
    logged[key] = true
  }
}

const turnOnLogger = (key: keyof typeof logged) => {
  logged[key] = false
}

export const processQueuedCampaigns = cronJob(
  "process-queued-campaigns",
  async () => {
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

    if (queuedCampaigns.length === 0) {
      oneTimeLogger(
        "noQueuedCampaigns",
        "Cron job: No queued campaigns to process."
      )
      return
    }

    turnOnLogger("noQueuedCampaigns")

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
            "missingCampaignData",
            `Cron job: Campaign ${campaign.id} is missing required data (content, subject, organization, or baseURL). Skipping.`
          )
          // Optionally, update status to FAILED or similar
          // await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'FAILED', statusReason: 'Missing critical data for processing' } });
          continue
        }

        turnOnLogger("missingCampaignData")

        const generalSettings = campaign.Organization.GeneralSettings

        const selectedListIds = campaign.CampaignLists.map((cl) => cl.listId)

        const allSubscribersMap = await getSubscribersForCampaign(
          campaign.id,
          selectedListIds
        )
        if (allSubscribersMap.size === 0) {
          oneTimeLogger(
            "noSubscribers",
            `Cron job: Campaign ${campaign.id} has no subscribers. Skipping.`
          )
          continue
        }

        turnOnLogger("noSubscribers")

        const messageSubscriberIds = (
          await prisma.message.findMany({
            where: { campaignId: campaign.id },
            select: { subscriberId: true },
          })
        ).map((m) => m.subscriberId)
        const subscribersWithMessage = new Set(messageSubscriberIds)

        const subscribersToProcess = Array.from(
          allSubscribersMap.values()
        ).filter((sub) => !subscribersWithMessage.has(sub.id))

        if (subscribersToProcess.length === 0) {
          continue
        }

        await prisma.$transaction(
          async (tx) => {
            const linkTracker = new LinkTracker(tx)
            const messagesToCreate: Prisma.MessageCreateManyInput[] = []

            for (const subscriber of subscribersToProcess) {
              const messageId = uuidV4()
              if (!campaign.content) {
                oneTimeLogger(
                  "missingCampaignContent",
                  `Cron job: Campaign ${campaign.id} has no content. Skipping.`
                )
                continue
              }

              turnOnLogger("missingCampaignContent")

              let emailContent = campaign.Template
                ? campaign.Template.content.replace(
                    /{{content}}/g,
                    campaign.content
                  )
                : campaign.content

              if (!campaign.subject) {
                oneTimeLogger(
                  "missingCampaignSubject",
                  `Cron job: Campaign ${campaign.id} has no subject. Skipping.`
                )
                continue
              }

              turnOnLogger("missingCampaignSubject")

              const placeholderData: Partial<
                Record<PlaceholderDataKey, string>
              > = {
                "subscriber.email": subscriber.email,
                "campaign.name": campaign.title,
                "campaign.subject": campaign.subject,
                "organization.name": campaign.Organization.name,
                unsubscribe_link: `${generalSettings.baseURL}/unsubscribe?sid=${subscriber.id}&cid=${campaign.id}&mid=${messageId}`,
                current_date: new Date().toLocaleDateString("en-CA"),
              }

              if (campaign.openTracking) {
                emailContent += `<img src="${generalSettings.baseURL}/img/${messageId}/img.png" alt="" width="1" height="1" style="display:none" />`
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

              if (!generalSettings.baseURL) {
                console.error(
                  `Cron job: Campaign ${campaign.id} has no baseURL. Skipping.`
                )
                continue
              }

              const { content: finalContent } =
                await linkTracker.replaceMessageContentWithTrackedLinks(
                  emailContent,
                  campaign.id,
                  generalSettings.baseURL
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
                await tx.campaign.update({
                  where: { id: campaign.id },
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

        turnOnLogger("errorProcessingCampaign")
      } catch (error) {
        oneTimeLogger(
          "errorProcessingCampaign",
          `Cron job: Error processing campaign ${campaign.id}:`,
          error
        )
        // Optionally, mark campaign as FAILED
        // await prisma.campaign.update({ where: { id: basicCampaignInfo.id }, data: { status: 'FAILED', statusReason: error.message }});
      }
    }
  }
)
