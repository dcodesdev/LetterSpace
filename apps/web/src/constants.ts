import { z } from "zod"

export const constants = z
  .object({
    VITE_API_URL: z.string().optional(),
    isDev: z.boolean(),
    GITHUB_URL: z.string(),
  })
  .transform((env) => ({
    ...env,
    trpcUrl: import.meta.env.DEV ? `${env.VITE_API_URL}/trpc` : "/trpc",
  }))
  .parse({
    ...import.meta.env,
    isDev: import.meta.env.DEV,
    GITHUB_URL: "https://github.com/dcodesdev/letterspace",
  })
