import express from "express"
import { prisma } from "../utils/prisma"
import { authenticateApiKey } from "./middleware"
import { z } from "zod"
import { Prisma } from "../../prisma/client"
import crypto from "crypto"
import { Mailer } from "../lib/Mailer"
import fs from "fs/promises"
import path from "path"
import dayjs from "dayjs"

export const apiRouter = express.Router()

apiRouter.use(authenticateApiKey)

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     ApiKeyAuth:
 *       type: apiKey
 *       in: header
 *       name: x-api-key
 *   schemas:
 *     Subscriber:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         name:
 *           type: string
 *           nullable: true
 *         lists:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *         metadata:
 *           type: object
 *           additionalProperties:
 *             type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         emailVerified:
 *           type: boolean
 */

/**
 * @swagger
 * /api/subscribers:
 *   post:
 *     security:
 *       - ApiKeyAuth: []
 *     summary: Create a new subscriber
 *     tags:
 *       - Subscribers
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - lists
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               name:
 *                 type: string
 *               lists:
 *                 type: array
 *                 items:
 *                   type: string
 *               doubleOptIn:
 *                 type: boolean
 *               emailVerified:
 *                 type: boolean
 *               metadata:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *                 description: Key-value pairs for subscriber metadata. Providing this will overwrite all existing metadata.
 *     responses:
 *       201:
 *         description: Subscriber created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subscriber'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 */
apiRouter.post("/subscribers", async (req, res) => {
  try {
    const { data: body, error: validationError } = z
      .object({
        email: z
          .string()
          .min(1, "Email is required")
          .email("Invalid email format"),
        name: z.string().optional(),
        lists: z.array(z.string()).min(1, "At least one listId is required"),
        doubleOptIn: z.boolean().optional(),
        emailVerified: z.boolean().optional(),
        metadata: z.record(z.string(), z.string()).optional(),
      })
      .safeParse(req.body)

    if (validationError) {
      res.status(400).json({
        error: validationError.issues[0]?.message || "Invalid input data",
      })
      return
    }

    const {
      email,
      name,
      lists,
      doubleOptIn,
      emailVerified,
      metadata: newMetadata,
    } = body

    const existingLists = await prisma.list.findMany({
      where: {
        id: {
          in: lists,
        },
        organizationId: req.organization.id,
      },
    })

    if (existingLists.length !== lists.length) {
      const foundListIds = existingLists.map((list) => list.id)
      const missingListId = lists.find((id) => !foundListIds.includes(id))
      res.status(400).json({ error: `List with id ${missingListId} not found` })
      return
    }

    const existingSubscriber = await prisma.subscriber.findFirst({
      where: {
        email,
        organizationId: req.organization.id,
      },
      include: {
        ListSubscribers: {
          include: {
            List: true,
          },
        },
        Metadata: true,
      },
    })

    const existingListIds =
      existingSubscriber?.ListSubscribers.map((list) => list.List.id) || []
    const allLists = existingListIds.concat(lists)

    const uniqueLists = [...new Set(allLists)]

    const isExpired = existingSubscriber?.emailVerificationTokenExpiresAt
      ? dayjs(existingSubscriber.emailVerificationTokenExpiresAt).isBefore(
          dayjs()
        )
      : true

    const shouldSendVerificationEmail =
      doubleOptIn && !existingSubscriber?.emailVerified && isExpired

    if (shouldSendVerificationEmail) {
      const emailVerificationToken = crypto.randomBytes(32).toString("hex")
      const emailVerificationTokenExpiresAt = dayjs().add(24, "hours").toDate()
      const emailVerified = false

      try {
        const smtpSettings = await prisma.smtpSettings.findFirst({
          where: { organizationId: req.organization.id },
        })

        if (!smtpSettings) {
          console.error(
            `SMTP settings not found for organization ${req.organization.id}.`
          )
          res.status(422).json({
            error:
              "SMTP settings not configured for this organization. Cannot send verification email.",
          })
          return
        }

        const generalSettings = await prisma.generalSettings.findFirst({
          where: { organizationId: req.organization.id },
        })

        if (!generalSettings || !generalSettings.baseURL) {
          console.error(
            `General settings (especially baseURL) not found for organization ${req.organization.id}.`
          )
          res.status(422).json({
            error:
              "Base URL not configured in general settings for this organization. Cannot send verification email.",
          })
          return
        }

        const fromEmailAddress =
          smtpSettings.fromEmail || generalSettings.defaultFromEmail
        if (!fromEmailAddress) {
          console.error(
            `Sender email (fromEmail/defaultFromEmail) not configured for organization ${req.organization.id}.`
          )
          res.status(422).json({
            error:
              "Sender email not configured for this organization. Cannot send verification email.",
          })
          return
        }

        const mailer = new Mailer(smtpSettings)
        const verificationLink = `${generalSettings.baseURL.replace(/\/$/, "")}/verify-email?token=${emailVerificationToken}`

        const templatePath = path.join(
          __dirname,
          "../../templates/verificationEmail.html"
        )
        let emailHtmlContent = await fs.readFile(templatePath, "utf-8")

        emailHtmlContent = emailHtmlContent
          .replace(/{{name}}/g, name || "there")
          .replace(/{{verificationLink}}/g, verificationLink)
          .replace(/{{currentYear}}/g, new Date().getFullYear().toString())

        await mailer.sendEmail({
          to: email,
          from: fromEmailAddress,
          subject: "Verify Your Email Address",
          html: emailHtmlContent,
        })

        const subscriber = await prisma.subscriber.upsert({
          where: { id: existingSubscriber?.id || "create" },
          update: {
            emailVerificationToken,
            emailVerificationTokenExpiresAt,
            emailVerified,
            ListSubscribers: {
              deleteMany: {},
              create: uniqueLists.map((listId: string) => ({
                List: { connect: { id: listId } },
              })),
            },
            Metadata: newMetadata
              ? {
                  deleteMany: {},
                  create: Object.entries(newMetadata).map(([key, value]) => ({
                    key,
                    value,
                  })),
                }
              : undefined,
          },
          create: {
            email,
            name,
            organizationId: req.organization.id,
            emailVerified,
            emailVerificationToken,
            emailVerificationTokenExpiresAt,
            ListSubscribers: {
              create: uniqueLists.map((listId: string) => ({
                List: { connect: { id: listId } },
              })),
            },
            Metadata: newMetadata
              ? {
                  create: Object.entries(newMetadata).map(([key, value]) => ({
                    key,
                    value,
                  })),
                }
              : undefined,
          },
          select: {
            id: true,
            email: true,
            name: true,
            ListSubscribers: { include: { List: true } },
            Metadata: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
          },
        })

        const data = {
          id: subscriber.id,
          email: subscriber.email,
          name: subscriber.name,
          lists: subscriber.ListSubscribers.map((list) => ({
            id: list.List.id,
            name: list.List.name,
            description: list.List.description,
          })),
          metadata: subscriber.Metadata.reduce(
            (acc, meta) => {
              acc[meta.key] = meta.value
              return acc
            },
            {} as Record<string, string>
          ),
          emailVerified: subscriber.emailVerified,
          createdAt: subscriber.createdAt,
          updatedAt: subscriber.updatedAt,
        }

        console.log("data", data)

        res.status(201).json(data)
        return
      } catch (emailError: any) {
        console.error(
          `Error sending verification email to ${email}:`,
          emailError
        )
        res.status(422).json({
          error: `Failed to send verification email: ${emailError.message || "Unknown reason"}`,
        })
        return
      }
    }

    const subscriber = await prisma.subscriber.upsert({
      where: {
        id: existingSubscriber?.id || "create",
      },
      update: {
        email,
        name,
        emailVerified,
        ListSubscribers: {
          deleteMany: {},
          create: uniqueLists.map((listId: string) => ({
            List: { connect: { id: listId } },
          })),
        },
        Metadata: newMetadata
          ? {
              deleteMany: {},
              create: Object.entries(newMetadata).map(([key, value]) => ({
                key,
                value,
              })),
            }
          : undefined,
      },
      create: {
        email,
        name,
        organizationId: req.organization.id,
        emailVerified,
        ListSubscribers: {
          create: uniqueLists.map((listId: string) => ({
            List: {
              connect: {
                id: listId,
              },
            },
          })),
        },
        Metadata: newMetadata
          ? {
              create: Object.entries(newMetadata).map(([key, value]) => ({
                key,
                value,
              })),
            }
          : undefined,
      },
      include: {
        ListSubscribers: {
          include: {
            List: true,
          },
        },
        Metadata: true,
      },
    })

    const data = {
      id: subscriber.id,
      email: subscriber.email,
      name: subscriber.name,
      lists: subscriber.ListSubscribers.map((list) => ({
        id: list.List.id,
        name: list.List.name,
        description: list.List.description,
      })),
      metadata: subscriber.Metadata.reduce(
        (acc, meta) => {
          acc[meta.key] = meta.value
          return acc
        },
        {} as Record<string, string>
      ),
      emailVerified: subscriber.emailVerified,
      createdAt: subscriber.createdAt,
      updatedAt: subscriber.updatedAt,
    }

    res.status(201).json(data)
  } catch (error) {
    console.error("Error creating subscriber", error)
    res.status(500).json({ error: "Server error" })
  }
})

/**
 * @swagger
 * /api/subscribers/{id}:
 *   put:
 *     security:
 *       - ApiKeyAuth: []
 *     summary: Update a subscriber
 *     tags:
 *       - Subscribers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscriber ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               name:
 *                 type: string
 *               lists:
 *                 type: array
 *                 items:
 *                   type: string
 *               metadata:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *                 description: Key-value pairs for subscriber metadata. Providing this will overwrite all existing metadata.
 *     responses:
 *       200:
 *         description: Subscriber updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subscriber'
 *       400:
 *         description: Invalid input data or ID format
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *       404:
 *         description: Subscriber not found
 */
apiRouter.put("/subscribers/:id", async (req, res) => {
  try {
    const { data: body, error } = z
      .object({
        email: z.string().email().optional(),
        name: z.string().optional(),
        lists: z
          .array(z.string())
          .min(1, "At least one listId is required")
          .optional(),
        metadata: z.record(z.string(), z.string()).optional(),
        emailVerified: z.boolean().optional(),
      })
      .safeParse(req.body)

    if (error) {
      res
        .status(400)
        .json({ error: error.issues[0]?.message || "Invalid input data" })
      return
    }

    const { email, name, lists, metadata: newMetadata, emailVerified } = body

    const id = req.params.id

    if (typeof id !== "string") {
      res.status(400).json({ error: "Invalid id" })
      return
    }

    const subscriber = await prisma.subscriber.findFirst({
      where: {
        id,
        organizationId: req.organization.id,
      },
      include: {
        ListSubscribers: {
          include: {
            List: true,
          },
        },
        Metadata: true,
      },
    })
    if (!subscriber) {
      res.status(404).json({ error: "Subscriber not found" })
      return
    }

    if (lists?.length) {
      const existingLists = await prisma.list.findMany({
        where: {
          id: {
            in: lists,
          },
          organizationId: req.organization.id,
        },
      })

      if (existingLists.length !== lists.length) {
        const foundListIds = existingLists.map((list) => list.id)
        const missingListId = lists.find((id) => !foundListIds.includes(id))
        res
          .status(400)
          .json({ error: `List with id ${missingListId} not found` })
        return
      }
    }

    const updatedSubscriber = await prisma.subscriber.update({
      where: {
        id,
      },
      data: {
        email,
        name,
        emailVerified,
        ListSubscribers: lists?.length
          ? {
              deleteMany: {},
              create: Array.isArray(lists)
                ? lists.map((listId: string) => ({
                    List: { connect: { id: listId } },
                  }))
                : [],
            }
          : undefined,
        Metadata: newMetadata
          ? {
              deleteMany: {},
              create: Object.entries(newMetadata).map(([key, value]) => ({
                key,
                value,
              })),
            }
          : undefined,
      },
      include: {
        ListSubscribers: {
          include: {
            List: true,
          },
        },
        Metadata: true,
      },
    })

    const data = {
      id: updatedSubscriber.id,
      email: updatedSubscriber.email,
      name: updatedSubscriber.name,
      lists: updatedSubscriber.ListSubscribers.map((list) => ({
        id: list.List.id,
        name: list.List.name,
        description: list.List.description,
      })),
      metadata: updatedSubscriber.Metadata.reduce(
        (acc, meta) => {
          acc[meta.key] = meta.value
          return acc
        },
        {} as Record<string, string>
      ),
      createdAt: updatedSubscriber.createdAt,
      updatedAt: updatedSubscriber.updatedAt,
    }

    res.json(data)
  } catch (error) {
    console.error("Error updating subscriber", error)
    res.status(500).json({ error: "Server error" })
  }
})

/**
 * @swagger
 * /api/subscribers/{id}:
 *   delete:
 *     security:
 *       - ApiKeyAuth: []
 *     summary: Delete a subscriber
 *     tags:
 *       - Subscribers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscriber ID
 *     responses:
 *       200:
 *         description: Subscriber deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Invalid ID format
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *       404:
 *         description: Subscriber not found
 */
apiRouter.delete("/subscribers/:id", async (req, res) => {
  try {
    const { id } = req.params

    if (typeof id !== "string") {
      res.status(400).json({ error: "Invalid id" })
      return
    }

    const subscriber = await prisma.subscriber.findFirst({
      where: {
        id,
        organizationId: req.organization.id,
      },
    })

    if (!subscriber) {
      res.status(404).json({ error: "Subscriber not found" })
      return
    }

    await prisma.subscriber.delete({
      where: {
        id,
      },
    })

    res.json({ success: true })
  } catch (error) {
    console.error("Error deleting subscriber", error)
    res.status(500).json({ error: "Server error" })
  }
})

/**
 * @swagger
 * /api/subscribers/{id}:
 *   get:
 *     security:
 *       - ApiKeyAuth: []
 *     summary: Get a subscriber by ID
 *     tags:
 *       - Subscribers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscriber ID
 *     responses:
 *       200:
 *         description: Subscriber details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subscriber'
 *       400:
 *         description: Invalid ID format
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *       404:
 *         description: Subscriber not found
 */
apiRouter.get("/subscribers/:id", async (req, res) => {
  try {
    const { id } = req.params

    if (typeof id !== "string") {
      res.status(400).json({ error: "Invalid id" })
      return
    }

    const subscriber = await prisma.subscriber.findFirst({
      where: {
        id,
        organizationId: req.organization.id,
      },
      include: {
        ListSubscribers: { include: { List: true } },
        Messages: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 10,
        },
        Metadata: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    })
    if (!subscriber) {
      res.status(404).json({ error: "Subscriber not found" })
      return
    }

    const subscriberData = {
      id: subscriber.id,
      email: subscriber.email,
      name: subscriber.name,
      lists: subscriber.ListSubscribers.map((list) => ({
        id: list.List.id,
        name: list.List.name,
        description: list.List.description,
      })),
      metadata: subscriber.Metadata.reduce(
        (acc, meta) => {
          acc[meta.key] = meta.value
          return acc
        },
        {} as Record<string, string>
      ),
      createdAt: subscriber.createdAt,
      updatedAt: subscriber.updatedAt,
    }

    res.json(subscriberData)
  } catch (error) {
    console.error("Error fetching subscriber", error)
    res.status(500).json({ error: "Server error" })
  }
})

/**
 * @swagger
 * /api/subscribers:
 *   get:
 *     security:
 *       - ApiKeyAuth: []
 *     summary: List subscribers
 *     tags:
 *       - Subscribers
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *         description: Page number (default 1)
 *       - in: query
 *         name: perPage
 *         schema:
 *           type: string
 *         description: Items per page (default 100)
 *       - in: query
 *         name: emailEquals
 *         schema:
 *           type: string
 *         description: Filter by exact email match
 *       - in: query
 *         name: nameEquals
 *         schema:
 *           type: string
 *         description: Filter by exact name match
 *     responses:
 *       200:
 *         description: List of subscribers with pagination info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Subscriber'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     perPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 */
apiRouter.get("/subscribers", async (req, res) => {
  try {
    const { data: query, error } = z
      .object({
        page: z
          .string()
          .optional()
          .default("1")
          .transform(Number)
          .refine((val) => val > 0, "Invalid page number"),
        perPage: z
          .string()
          .optional()
          .default("100")
          .transform(Number)
          .refine((val) => val > 0, "Invalid perPage number"),
        emailEquals: z.string().optional(),
        nameEquals: z.string().optional(),
      })
      .safeParse(req.query)

    if (error) {
      res
        .status(400)
        .json({ error: error.issues[0]?.message || "Invalid input data" })
      return
    }

    const { page, perPage, emailEquals, nameEquals } = query

    const where: Prisma.SubscriberWhereInput = {
      organizationId: req.organization.id,
    }

    if (emailEquals) {
      where.email = { equals: emailEquals }
    }

    if (nameEquals) {
      where.name = { equals: nameEquals }
    }

    const total = await prisma.subscriber.count({ where })
    const subscribers = await prisma.subscriber.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        ListSubscribers: {
          include: {
            List: true,
          },
        },
        Metadata: true,
      },
    })

    const totalPages = Math.ceil(total / perPage)

    const subscribersFormatted = subscribers.map((subscriber) => ({
      id: subscriber.id,
      email: subscriber.email,
      name: subscriber.name,
      lists: subscriber.ListSubscribers.map((list) => ({
        id: list.List.id,
        name: list.List.name,
        description: list.List.description,
      })),
      metadata: subscriber.Metadata.reduce(
        (acc, meta) => {
          acc[meta.key] = meta.value
          return acc
        },
        {} as Record<string, string>
      ),
      createdAt: subscriber.createdAt,
      updatedAt: subscriber.updatedAt,
    }))

    res.json({
      data: subscribersFormatted,
      pagination: {
        total,
        page,
        perPage,
        totalPages,
        hasMore: page < totalPages,
      },
    })
  } catch (error) {
    console.error("Error fetching subscribers", error)
    res.status(500).json({ error: "Server error" })
  }
})
