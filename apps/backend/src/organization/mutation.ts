import { z } from "zod"
import { authProcedure } from "../trpc"
import { prisma } from "../utils/prisma"
import fs from "fs/promises"

const createOrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  description: z.string().optional(),
})

export const createOrganization = authProcedure
  .input(createOrganizationSchema)
  .mutation(async ({ ctx, input }) => {
    const organization = await prisma.organization.create({
      data: {
        name: input.name,
        description: input.description,
        UserOrganizations: {
          create: {
            userId: ctx.user.id,
          },
        },
        Templates: {
          createMany: {
            data: [
              {
                name: "Newsletter",
                content: await fs.readFile(
                  "templates/newsletter.html",
                  "utf-8"
                ),
              },
            ],
          },
        },
        EmailDeliverySettings: {
          // Default settings
          create: {},
        },
        GeneralSettings: {
          // Default settings
          create: {},
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
    })

    return {
      organization,
    }
  })
