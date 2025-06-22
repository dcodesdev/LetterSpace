import * as trpcExpress from "@trpc/server/adapters/express"
import path from "path"
import express from "express"
import cors from "cors"
import { prisma } from "./utils/prisma"
import swaggerUi from "swagger-ui-express"

import { createContext, router } from "./trpc"
import { userRouter } from "./user/router"
import { listRouter } from "./list/router"
import { organizationRouter } from "./organization/router"
import { subscriberRouter } from "./subscriber/router"
import { templateRouter } from "./template/router"
import { campaignRouter } from "./campaign/router"
import { messageRouter } from "./message/router"
import { settingsRouter } from "./settings/router"
import { webhookRouter } from "./webhook/router"
import swaggerSpec from "./swagger"
import { apiRouter } from "./api/server"
import { dashboardRouter } from "./dashboard/router"
import { statsRouter } from "./stats/router"
import { ONE_PX_PNG } from "./constants"
import { handleWebhook } from "./webhook/handler"

const appRouter = router({
  user: userRouter,
  list: listRouter,
  organization: organizationRouter,
  subscriber: subscriberRouter,
  template: templateRouter,
  campaign: campaignRouter,
  message: messageRouter,
  settings: settingsRouter,
  webhook: webhookRouter,
  dashboard: dashboardRouter,
  stats: statsRouter,
})

export type AppRouter = typeof appRouter

export const app = express()

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:4173"],
  })
)
app.use(express.json())

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.get("/t/:id", async (req, res) => {
  try {
    const { id } = req.params
    const subscriberId = req.query.sid

    const trackedLink = await prisma.trackedLink.findUnique({
      where: { id },
    })

    if (!trackedLink) {
      res.status(404).send("Link not found")
      return
    }

    res.redirect(trackedLink.url)

    if (subscriberId && typeof subscriberId === "string") {
      await prisma
        .$transaction(async (tx) => {
          // add a new click
          await tx.click.create({
            data: {
              subscriberId,
              trackedLinkId: trackedLink.id,
            },
          })

          if (!trackedLink.campaignId) return

          const message = await tx.message.findFirst({
            where: {
              campaignId: trackedLink.campaignId,
              subscriberId,
              status: {
                not: "CLICKED",
              },
            },
          })

          if (!message) return

          await tx.message.update({
            where: {
              id: message.id,
            },
            data: {
              status: "CLICKED",
            },
          })
        })
        .catch((error) => {
          console.error("Error updating message status", error)
        })
    }
  } catch (error) {
    res.status(404).send("Link not found")
  }
})

app.get("/img/:id/img.png", async (req, res) => {
  // Send pixel immediately
  const pixel = Buffer.from(ONE_PX_PNG, "base64")
  res.setHeader("Content-Type", "image/png")
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate")
  res.setHeader("Pragma", "no-cache")
  res.setHeader("Expires", "0")
  res.end(pixel)

  const id = req.params.id

  try {
    await prisma.$transaction(async (tx) => {
      const message = await tx.message.findUnique({
        where: {
          id,
          Campaign: {
            openTracking: true,
          },
        },
      })

      if (!message) {
        return
      }

      if (message.status !== "SENT" && message.status !== "AWAITING_WEBHOOK") {
        return
      }

      await tx.message.update({
        where: { id },
        data: {
          status: "OPENED",
        },
      })
    })
  } catch (error) {
    console.error("Error updating message status", error)
  }
})

app.use("/api", apiRouter)

app.post("/webhook/:webhookId", handleWebhook)

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
)

const staticPath = path.join(__dirname, "..", "..", "web", "dist")

// serve SPA content
app.use(express.static(staticPath))

app.get("*", (_, res) => {
  res.sendFile(path.join(staticPath, "index.html"))
})
