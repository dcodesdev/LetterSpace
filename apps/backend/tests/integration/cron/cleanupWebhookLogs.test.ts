import {
  createOrganization,
  createWebhook,
  createWebhookLog,
} from "@helpers/factories"
import { cleanupWebhookLogsCron } from "@src/cron/cleanupWebhookLogs"
import { prisma } from "@src/utils/prisma"
import { subDays } from "date-fns"
import { beforeEach, describe, expect, it, vi } from "vitest"

const seedOrg = async (cleanupInterval?: number) => {
  const org = await createOrganization()

  if (cleanupInterval !== undefined) {
    await prisma.generalSettings.updateMany({
      where: { organizationId: org.id },
      data: { cleanupInterval },
    })
  }

  const webhook = await createWebhook({ organizationId: org.id })

  return { org, webhook }
}

const exists = async (id: string) =>
  (await prisma.webhookLog.count({ where: { id } })) === 1

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {})
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("cleanupWebhookLogs cron", () => {
  it("does nothing with no organizations", async () => {
    await expect(cleanupWebhookLogsCron()).resolves.toBeUndefined()
  })

  it("does nothing when there are no logs", async () => {
    await seedOrg()

    await cleanupWebhookLogsCron()

    expect(await prisma.webhookLog.count()).toBe(0)
  })

  it("deletes a log older than the cleanup interval", async () => {
    const { webhook } = await seedOrg(30)
    const old = await createWebhookLog({
      webhookId: webhook.id,
      createdAt: subDays(new Date(), 60),
    })

    await cleanupWebhookLogsCron()

    expect(await exists(old.id)).toBe(false)
  })

  it("keeps a log created inside the cleanup interval", async () => {
    const { webhook } = await seedOrg(30)
    const recent = await createWebhookLog({
      webhookId: webhook.id,
      createdAt: subDays(new Date(), 10),
    })

    await cleanupWebhookLogsCron()

    expect(await exists(recent.id)).toBe(true)
  })

  it("keeps the webhook itself", async () => {
    const { webhook } = await seedOrg(30)
    await createWebhookLog({
      webhookId: webhook.id,
      createdAt: subDays(new Date(), 60),
    })

    await cleanupWebhookLogsCron()

    expect(await prisma.webhook.count({ where: { id: webhook.id } })).toBe(1)
  })

  it("uses the schema default of 90 days when the interval is untouched", async () => {
    const { webhook } = await seedOrg()
    const kept = await createWebhookLog({
      webhookId: webhook.id,
      createdAt: subDays(new Date(), 60),
    })
    const deleted = await createWebhookLog({
      webhookId: webhook.id,
      createdAt: subDays(new Date(), 100),
    })

    await cleanupWebhookLogsCron()

    expect(await exists(kept.id)).toBe(true)
    expect(await exists(deleted.id)).toBe(false)
  })

  it("honours a per-organization cleanup interval", async () => {
    const shortInterval = await seedOrg(7)
    const longInterval = await seedOrg(365)

    const deleted = await createWebhookLog({
      webhookId: shortInterval.webhook.id,
      createdAt: subDays(new Date(), 30),
    })
    const kept = await createWebhookLog({
      webhookId: longInterval.webhook.id,
      createdAt: subDays(new Date(), 30),
    })

    await cleanupWebhookLogsCron()

    expect(await exists(deleted.id)).toBe(false)
    expect(await exists(kept.id)).toBe(true)
  })

  it("does not touch another organization's logs", async () => {
    const target = await seedOrg(7)
    const other = await seedOrg(7)

    const mine = await createWebhookLog({
      webhookId: target.webhook.id,
      createdAt: subDays(new Date(), 1),
    })
    const theirs = await createWebhookLog({
      webhookId: other.webhook.id,
      createdAt: subDays(new Date(), 1),
    })

    await cleanupWebhookLogsCron()

    expect(await exists(mine.id)).toBe(true)
    expect(await exists(theirs.id)).toBe(true)
  })

  it("is idempotent across runs", async () => {
    const { webhook } = await seedOrg(30)
    await createWebhookLog({
      webhookId: webhook.id,
      createdAt: subDays(new Date(), 60),
    })
    const kept = await createWebhookLog({
      webhookId: webhook.id,
      createdAt: subDays(new Date(), 1),
    })

    await cleanupWebhookLogsCron()
    await cleanupWebhookLogsCron()

    expect(await prisma.webhookLog.count()).toBe(1)
    expect(await exists(kept.id)).toBe(true)
  })
})
