import { z } from "zod"

export const env = z
  .object({
    JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    // Webhook transformer runtime limits (in bytes)
    WEBHOOK_MEMORY_LIMIT: z.string().optional().default("16777216"), // 16MB default
    WEBHOOK_MAX_STACK_SIZE: z.string().optional().default("262144"), // 256KB default
  })
  .parse(process.env)

export const ONE_PX_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
