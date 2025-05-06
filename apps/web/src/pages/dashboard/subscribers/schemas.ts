import * as z from "zod"

export const addSubscriberSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  name: z.string().optional(),
  listIds: z.array(z.string()),
  emailVerified: z.boolean().optional(),
})

export const editSubscriberSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  name: z.string().optional(),
  listIds: z.array(z.string()),
  emailVerified: z.boolean().optional(),
})
