import { z } from "zod"

export const tokenPayloadSchema = z.object({
  id: z.string(),
  version: z.number(),
  iat: z.number(),
  exp: z.number(),
})
