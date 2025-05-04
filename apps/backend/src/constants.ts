import { z } from "zod"

export const env = z
  .object({
    JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  })
  .parse(process.env)

export const ONE_PX_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
