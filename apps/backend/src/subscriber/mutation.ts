import { z } from "zod"
import { authProcedure, publicProcedure } from "../trpc"
import { prisma } from "../utils/prisma"
import { TRPCError } from "@trpc/server"
import { parse } from "csv-parse"
import { Readable } from "stream"

const createSubscriberSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
  organizationId: z.string(),
  listIds: z.array(z.string()),
  emailVerified: z.boolean().optional(),
  metadata: z
    .array(
      z.object({
        key: z.string().min(1),
        value: z.string().min(1),
      })
    )
    .optional(),
})

export const createSubscriber = authProcedure
  .input(createSubscriberSchema)
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

    const existingSubscriber = await prisma.subscriber.findFirst({
      where: {
        email: input.email,
        organizationId: input.organizationId,
      },
    })

    if (existingSubscriber) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Subscriber with this email already exists",
      })
    }

    const subscriber = await prisma.subscriber.create({
      data: {
        email: input.email,
        name: input.name,
        organizationId: input.organizationId,
        emailVerified: input.emailVerified,
        ListSubscribers: {
          create: input.listIds.map((listId) => ({
            List: {
              connect: {
                id: listId,
              },
            },
          })),
        },
        Metadata: input.metadata
          ? {
              create: input.metadata.map((meta) => ({
                key: meta.key,
                value: meta.value,
              })),
            }
          : undefined,
      },
    })

    return { subscriber }
  })

const updateSubscriberSchema = z.object({
  id: z.string(),
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
  organizationId: z.string(),
  listIds: z.array(z.string()),
  emailVerified: z.boolean().optional(),
  metadata: z
    .array(
      z.object({
        key: z.string().min(1),
        value: z.string().min(1),
      })
    )
    .optional(),
})

export const updateSubscriber = authProcedure
  .input(updateSubscriberSchema)
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

    const subscriber = await prisma.subscriber.findFirst({
      where: {
        id: input.id,
        organizationId: input.organizationId,
      },
      include: {
        ListSubscribers: true,
      },
    })

    if (!subscriber) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Subscriber not found",
      })
    }

    // Get current list IDs
    const currentListIds = subscriber.ListSubscribers.map((ls) => ls.listId)

    // Find lists to add and remove
    const listsToAdd = input.listIds.filter(
      (id) => !currentListIds.includes(id)
    )
    const listsToRemove = currentListIds.filter(
      (id) => !input.listIds.includes(id)
    )

    const updatedSubscriber = await prisma.subscriber.update({
      where: { id: input.id },
      data: {
        email: input.email,
        name: input.name,
        emailVerified: input.emailVerified,
        ListSubscribers: {
          deleteMany: {
            listId: {
              in: listsToRemove,
            },
          },
          create: listsToAdd.map((listId) => ({
            listId,
          })),
        },
        Metadata: input.metadata
          ? {
              deleteMany: {},
              create: input.metadata.map((meta) => ({
                key: meta.key,
                value: meta.value,
              })),
            }
          : { deleteMany: {} },
      },
      include: {
        ListSubscribers: {
          include: {
            List: true,
          },
        },
      },
    })

    return { subscriber: updatedSubscriber }
  })

export const deleteSubscriber = authProcedure
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

    const subscriber = await prisma.subscriber.findFirst({
      where: {
        id: input.id,
        organizationId: input.organizationId,
      },
    })

    if (!subscriber) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Subscriber not found",
      })
    }

    await prisma.subscriber.delete({
      where: { id: input.id },
    })

    return { success: true }
  })

export const importSubscribers = authProcedure
  .input(
    z.object({
      file: z.instanceof(FormData),
      organizationId: z.string(),
      listId: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const file = input.file.get("file") as File
    if (!file) {
      throw new Error("No file provided")
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const records: any[] = []

    // Parse CSV
    await new Promise((resolve, reject) => {
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
      })

      parser.on("readable", function () {
        let record
        while ((record = parser.read()) !== null) {
          records.push(record)
        }
      })

      parser.on("error", function (err) {
        reject(err)
      })

      parser.on("end", function () {
        resolve(undefined)
      })

      Readable.from(buffer).pipe(parser)
    })

    // Validate and transform records
    const subscribers = records.map((record) => ({
      email: record.email,
      firstName: record.first_name || null,
      lastName: record.last_name || null,
      phone: record.phone || null,
      company: record.company || null,
      jobTitle: record.job_title || null,
      city: record.city || null,
      country: record.country || null,
      subscribedAt: record.subscribed_at
        ? new Date(record.subscribed_at)
        : new Date(),
      tags: record.tags
        ? record.tags.split(",").map((t: string) => t.trim())
        : [],
      organizationId: input.organizationId,
    }))

    // Import subscribers
    const result = await prisma.$transaction(async (tx) => {
      const imported = await Promise.all(
        subscribers.map(async (sub) => {
          const subscriber = await tx.subscriber.upsert({
            where: {
              organizationId_email: {
                organizationId: input.organizationId,
                email: sub.email,
              },
            },
            create: sub,
            update: sub,
          })

          if (input.listId) {
            await tx.listSubscriber.upsert({
              where: {
                listId_subscriberId: {
                  listId: input.listId,
                  subscriberId: subscriber.id,
                },
              },
              create: {
                listId: input.listId,
                subscriberId: subscriber.id,
              },
              update: {},
            })
          }

          return subscriber
        })
      )

      return imported
    })

    return {
      count: result.length,
    }
  })

export const unsubscribeToggle = authProcedure
  .input(
    z.object({
      listSubscriberId: z.string(),
      organizationId: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const org = await prisma.userOrganization.findFirst({
      where: {
        userId: ctx.user.id,
        organizationId: input.organizationId,
      },
    })

    if (!org) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      })
    }

    const listSubscriber = await prisma.listSubscriber.findFirst({
      where: {
        id: input.listSubscriberId,
        Subscriber: {
          organizationId: org.organizationId,
        },
      },
    })

    if (!listSubscriber) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "List subscriber not found",
      })
    }

    const updated = await prisma.listSubscriber.update({
      where: { id: input.listSubscriberId },
      data: {
        unsubscribedAt: listSubscriber.unsubscribedAt ? null : new Date(),
      },
    })

    return {
      success: true,
      subbed: !updated.unsubscribedAt,
    }
  })

export const publicUnsubscribe = publicProcedure
  .input(z.object({ sid: z.string(), cid: z.string() }))
  .mutation(async ({ input }) => {
    try {
      const listSubscribers = await prisma.listSubscriber.findMany({
        where: {
          subscriberId: input.sid,
          List: {
            CampaignLists: {
              some: {
                campaignId: input.cid,
              },
            },
          },
          unsubscribedAt: null,
        },
      })

      if (!listSubscribers.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscriber not found",
        })
      }

      await prisma.listSubscriber.updateMany({
        where: {
          id: {
            in: listSubscribers.map((ls) => ls.id),
          },
        },
        data: {
          unsubscribedAt: new Date(),
        },
      })

      return {
        success: true,
      }
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to unsubscribe",
      })
    }
  })

export const verifyEmail = publicProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const subscriber = await prisma.subscriber.findFirst({
      where: {
        emailVerificationToken: input.token,
        emailVerificationTokenExpiresAt: {
          gt: new Date(),
        },
      },
    })

    if (!subscriber) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invalid or expired verification token",
      })
    }

    await prisma.subscriber.update({
      where: { id: subscriber.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiresAt: null,
      },
    })

    return { success: true }
  })
