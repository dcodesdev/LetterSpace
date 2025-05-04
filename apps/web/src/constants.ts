import { z } from "zod"

export const constants = z
  .object({
    VITE_API_URL: z.string(),
    isDev: z.boolean(),
    GITHUB_URL: z.string(),
  })
  .parse({
    ...import.meta.env,
    isDev: import.meta.env.DEV,
    GITHUB_URL: "https://github.com/your-project",
  })
