import {
  createCampaign,
  createMessage,
  createOrganization,
  createSubscriber,
} from "@helpers/factories"
import { request } from "@helpers/request"
import { waitFor } from "@helpers/wait-for"
import { ONE_PX_PNG } from "@src/constants"
import { prisma } from "@src/utils/prisma"
import { beforeEach, describe, expect, it } from "vitest"

const TARGET_URL = "https://example.com/landing"

let orgId: string
let campaignId: string
let subscriberId: string

beforeEach(async () => {
  const org = await createOrganization()
  orgId = org.id

  const campaign = await createCampaign({ organizationId: orgId })
  campaignId = campaign.id

  const subscriber = await createSubscriber({ organizationId: orgId })
  subscriberId = subscriber.id
})

const createTrackedLink = (url = TARGET_URL) =>
  prisma.trackedLink.create({ data: { url, campaignId } })

describe("GET /t/:id", () => {
  it("redirects to the tracked url", async () => {
    const link = await createTrackedLink()

    const response = await request.get(`/t/${link.id}`)

    expect(response.status).toBe(302)
    expect(response.headers.location).toBe(TARGET_URL)
  })

  it("records a click when a subscriber id is given", async () => {
    const link = await createTrackedLink()

    await request.get(`/t/${link.id}`).query({ sid: subscriberId })

    await waitFor(async () => {
      const clicks = await prisma.click.findMany({
        where: { trackedLinkId: link.id },
      })
      expect(clicks).toHaveLength(1)
      expect(clicks[0]?.subscriberId).toBe(subscriberId)
    })
  })

  it("does not record a click without a subscriber id", async () => {
    const link = await createTrackedLink()

    await request.get(`/t/${link.id}`)

    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(await prisma.click.count()).toBe(0)
  })

  it("marks the subscriber's message for that campaign as CLICKED", async () => {
    const link = await createTrackedLink()
    const message = await createMessage({
      campaignId,
      subscriberId,
      status: "SENT",
    })

    await request.get(`/t/${link.id}`).query({ sid: subscriberId })

    await waitFor(async () => {
      const updated = await prisma.message.findUniqueOrThrow({
        where: { id: message.id },
      })
      expect(updated.status).toBe("CLICKED")
    })
  })

  it("records repeat clicks but leaves an already CLICKED message alone", async () => {
    const link = await createTrackedLink()
    const message = await createMessage({
      campaignId,
      subscriberId,
      status: "CLICKED",
    })

    await request.get(`/t/${link.id}`).query({ sid: subscriberId })

    await waitFor(async () => {
      expect(await prisma.click.count()).toBe(1)
    })
    const updated = await prisma.message.findUniqueOrThrow({
      where: { id: message.id },
    })
    expect(updated.status).toBe("CLICKED")
    expect(updated.updatedAt).toEqual(message.updatedAt)
  })

  it("returns 404 for an unknown id", async () => {
    const response = await request.get(
      "/t/8f1c9a2e-0000-4000-8000-000000000000"
    )

    expect(response.status).toBe(404)
    expect(response.text).toBe("Link not found")
  })

  it("returns 404 for a malformed id", async () => {
    const response = await request.get("/t/not-a-uuid")

    expect(response.status).toBe(404)
  })
})

describe("GET /img/:id/img.png", () => {
  const sentMessage = (status: "SENT" | "AWAITING_WEBHOOK" = "SENT") =>
    createMessage({ campaignId, subscriberId, status })

  it("returns a 1x1 png with no-cache headers", async () => {
    const message = await sentMessage()

    const response = await request.get(`/img/${message.id}/img.png`)

    expect(response.status).toBe(200)
    expect(response.headers["content-type"]).toBe("image/png")
    expect(response.headers["cache-control"]).toBe(
      "no-cache, no-store, must-revalidate"
    )
    expect(response.body).toEqual(Buffer.from(ONE_PX_PNG, "base64"))

    // Drain the fire-and-forget write so it cannot land after the next reset.
    await waitFor(async () => {
      const updated = await prisma.message.findUniqueOrThrow({
        where: { id: message.id },
      })
      expect(updated.status).toBe("OPENED")
    })
  })

  it("marks a SENT message as OPENED", async () => {
    const message = await sentMessage()

    await request.get(`/img/${message.id}/img.png`)

    await waitFor(async () => {
      const updated = await prisma.message.findUniqueOrThrow({
        where: { id: message.id },
      })
      expect(updated.status).toBe("OPENED")
    })
  })

  it("marks an AWAITING_WEBHOOK message as OPENED", async () => {
    const message = await sentMessage("AWAITING_WEBHOOK")

    await request.get(`/img/${message.id}/img.png`)

    await waitFor(async () => {
      const updated = await prisma.message.findUniqueOrThrow({
        where: { id: message.id },
      })
      expect(updated.status).toBe("OPENED")
    })
  })

  it("leaves a message in a non-sent status alone", async () => {
    const message = await createMessage({
      campaignId,
      subscriberId,
      status: "QUEUED",
    })

    await request.get(`/img/${message.id}/img.png`)

    await new Promise((resolve) => setTimeout(resolve, 200))
    const updated = await prisma.message.findUniqueOrThrow({
      where: { id: message.id },
    })
    expect(updated.status).toBe("QUEUED")
  })

  it("does not track opens when the campaign has openTracking off", async () => {
    const campaign = await createCampaign({ organizationId: orgId })
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { openTracking: false },
    })
    const message = await createMessage({
      campaignId: campaign.id,
      subscriberId,
      status: "SENT",
    })

    await request.get(`/img/${message.id}/img.png`)

    await new Promise((resolve) => setTimeout(resolve, 200))
    const updated = await prisma.message.findUniqueOrThrow({
      where: { id: message.id },
    })
    expect(updated.status).toBe("SENT")
  })

  it("still serves the pixel for an unknown id", async () => {
    const response = await request.get(
      "/img/8f1c9a2e-0000-4000-8000-000000000000/img.png"
    )

    expect(response.status).toBe(200)
    expect(response.headers["content-type"]).toBe("image/png")
  })

  it("still serves the pixel for a malformed id", async () => {
    const response = await request.get("/img/not-a-uuid/img.png")

    expect(response.status).toBe(200)
  })
})
