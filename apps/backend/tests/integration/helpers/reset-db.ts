import { prisma } from "@src/utils/prisma"

export default async () => {
  await prisma.$transaction([
    prisma.organization.deleteMany(),
    prisma.user.deleteMany(),
    prisma.userOrganization.deleteMany(),
    prisma.subscriber.deleteMany(),
    prisma.campaign.deleteMany(),
    prisma.list.deleteMany(),
    prisma.campaignList.deleteMany(),
    prisma.listSubscriber.deleteMany(),
    prisma.template.deleteMany(),
    prisma.message.deleteMany(),
    prisma.trackedLink.deleteMany(),
    prisma.click.deleteMany(),
    prisma.apiKey.deleteMany(),
    prisma.smtpSettings.deleteMany(),
    prisma.generalSettings.deleteMany(),
    prisma.emailDeliverySettings.deleteMany(),
  ])
}
