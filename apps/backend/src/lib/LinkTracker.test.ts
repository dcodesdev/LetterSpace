import { createCampaign, createOrganization } from "@helpers/factories"
import { LinkTracker } from "@src/lib/LinkTracker"
import { prisma } from "@src/utils/prisma"
import { beforeEach, describe, expect, it } from "vitest"

const BASE_URL = "https://track.test"

let campaignId: string
let tracker: LinkTracker

beforeEach(async () => {
  const org = await createOrganization()
  const campaign = await createCampaign({ organizationId: org.id })
  campaignId = campaign.id
  tracker = new LinkTracker(prisma)
})

describe("LinkTracker", () => {
  describe("findTrackingLinksAndCreate", () => {
    it("creates a tracked link per @TRACK-suffixed url, without the suffix", async () => {
      const links = await tracker.findTrackingLinksAndCreate({
        content: `<a href="https://example.com/a@TRACK">a</a>
                  <a href="https://example.com/b@TRACK">b</a>`,
        campaignId,
      })

      expect(links.map((link) => link.url).sort()).toEqual([
        "https://example.com/a",
        "https://example.com/b",
      ])
      expect(await prisma.trackedLink.count({ where: { campaignId } })).toBe(2)
    })

    it("ignores urls that are not marked with the suffix", async () => {
      const links = await tracker.findTrackingLinksAndCreate({
        content: `<a href="https://example.com/plain">plain</a>`,
        campaignId,
      })

      expect(links).toEqual([])
      expect(await prisma.trackedLink.count({ where: { campaignId } })).toBe(0)
    })

    it("is idempotent — the same url upserts to the same row", async () => {
      const content = `<a href="https://example.com/a@TRACK">a</a>`

      const [first] = await tracker.findTrackingLinksAndCreate({
        content,
        campaignId,
      })
      const [second] = await tracker.findTrackingLinksAndCreate({
        content,
        campaignId,
      })

      expect(second?.id).toBe(first?.id)
      expect(await prisma.trackedLink.count({ where: { campaignId } })).toBe(1)
    })

    it("keeps tracked links for the same url separate per campaign", async () => {
      const org = await createOrganization()
      const other = await createCampaign({ organizationId: org.id })
      const content = `<a href="https://example.com/a@TRACK">a</a>`

      const [first] = await tracker.findTrackingLinksAndCreate({
        content,
        campaignId,
      })
      const [second] = await tracker.findTrackingLinksAndCreate({
        content,
        campaignId: other.id,
      })

      expect(second?.id).not.toBe(first?.id)
      expect(await prisma.trackedLink.count()).toBe(2)
    })

    it("matches http urls as well as https", async () => {
      const links = await tracker.findTrackingLinksAndCreate({
        content: `visit http://example.com/x@TRACK now`,
        campaignId,
      })

      expect(links.map((link) => link.url)).toEqual(["http://example.com/x"])
    })
  })

  describe("replaceMessageContentWithTrackedLinks", () => {
    it("rewrites each marked url to a tracking url and returns the ids", async () => {
      const { content, trackedIds } =
        await tracker.replaceMessageContentWithTrackedLinks(
          `<a href="https://example.com/a@TRACK">a</a><a href="https://example.com/b@TRACK">b</a>`,
          campaignId,
          BASE_URL
        )

      expect(trackedIds).toHaveLength(2)
      expect(content).toBe(
        `<a href="${BASE_URL}/r/${trackedIds[0]}">a</a><a href="${BASE_URL}/r/${trackedIds[1]}">b</a>`
      )
      expect(content).not.toContain("@TRACK")
    })

    it("leaves unmarked links untouched", async () => {
      const original = `<a href="https://example.com/plain">plain</a>`

      const { content, trackedIds } =
        await tracker.replaceMessageContentWithTrackedLinks(
          original,
          campaignId,
          BASE_URL
        )

      expect(content).toBe(original)
      expect(trackedIds).toEqual([])
    })

    it("reuses an already created tracked link", async () => {
      const content = `<a href="https://example.com/a@TRACK">a</a>`
      const [existing] = await tracker.findTrackingLinksAndCreate({
        content,
        campaignId,
      })

      const result = await tracker.replaceMessageContentWithTrackedLinks(
        content,
        campaignId,
        BASE_URL
      )

      expect(result.trackedIds).toEqual([existing?.id])
      expect(await prisma.trackedLink.count({ where: { campaignId } })).toBe(1)
    })

    it("works inside a transaction client", async () => {
      const result = await prisma.$transaction(async (tx) =>
        new LinkTracker(tx).replaceMessageContentWithTrackedLinks(
          `<a href="https://example.com/tx@TRACK">tx</a>`,
          campaignId,
          BASE_URL
        )
      )

      expect(result.trackedIds).toHaveLength(1)
      expect(
        await prisma.trackedLink.findUnique({
          where: { id: result.trackedIds[0]! },
        })
      ).toMatchObject({ url: "https://example.com/tx" })
    })
  })
})
