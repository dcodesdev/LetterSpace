import { prisma } from "../utils/prisma"

type TransactionClient = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0]

export class LinkTracker {
  private readonly trackSuffix = "@TRACK"
  private readonly tx: TransactionClient

  constructor(tx: TransactionClient) {
    this.tx = tx
  }

  private async getOrCreateTrackLink(url: string, campaignId: string) {
    const originalUrl = url.replace(this.trackSuffix, "")

    try {
      const trackedLink = await this.tx.trackedLink.upsert({
        where: {
          url_campaignId: {
            url: originalUrl,
            campaignId,
          },
        },
        create: {
          url: originalUrl,
          campaignId,
        },
        update: {},
      })

      return trackedLink
    } catch (error) {
      // In case of race condition, try to fetch the existing record
      return await this.tx.trackedLink.findFirstOrThrow({
        where: {
          url: originalUrl,
          campaignId,
        },
      })
    }
  }

  private findTrackingLinks(content: string) {
    const regex = /https?:\/\/[^\s<>"']+@TRACK/g
    const matches = content.match(regex)

    if (!matches) {
      return []
    }

    return matches
  }

  async findTrackingLinksAndCreate({
    content,
    campaignId,
  }: {
    content: string
    campaignId: string
  }) {
    const links = this.findTrackingLinks(content)

    const trackingLinks = await Promise.all(
      links.map((link) => this.getOrCreateTrackLink(link, campaignId))
    )

    return trackingLinks
  }

  async replaceMessageContentWithTrackedLinks(
    content: string,
    campaignId: string,
    baseURL: string
  ) {
    const links = this.findTrackingLinks(content)
    let updatedContent = content

    const trackedLinkResults = await Promise.all(
      links.map(async (link) => {
        const trackedLink = await this.getOrCreateTrackLink(link, campaignId)
        const trackingUrl = `${baseURL}/r/${trackedLink.id}`

        return {
          originalLink: link,
          trackedLinkId: trackedLink.id,
          trackingUrl,
        }
      })
    )

    trackedLinkResults.forEach(({ originalLink, trackingUrl }) => {
      updatedContent = updatedContent.replace(originalLink, trackingUrl)
    })

    return {
      content: updatedContent,
      trackedIds: trackedLinkResults.map(({ trackedLinkId }) => trackedLinkId),
    }
  }
}
