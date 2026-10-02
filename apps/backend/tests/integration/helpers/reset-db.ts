import { prisma } from "@src/utils/prisma"

// Ordered children-first so every delete is FK-safe even without cascades.
export default async () => {
  await prisma.$transaction([
    prisma.click.deleteMany(),
    prisma.trackedLink.deleteMany(),
    prisma.message.deleteMany(),
    prisma.webhookLog.deleteMany(),
    prisma.webhook.deleteMany(),
    prisma.campaignList.deleteMany(),
    prisma.listSubscriber.deleteMany(),
    prisma.campaign.deleteMany(),
    prisma.template.deleteMany(),
    prisma.list.deleteMany(),
    prisma.subscriberMetadata.deleteMany(),
    prisma.subscriber.deleteMany(),
    prisma.apiKey.deleteMany(),
    prisma.smtpSettings.deleteMany(),
    prisma.generalSettings.deleteMany(),
    prisma.emailDeliverySettings.deleteMany(),
    prisma.userOrganization.deleteMany(),
    prisma.user.deleteMany(),
    prisma.organization.deleteMany(),
  ])
}
