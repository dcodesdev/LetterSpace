import * as z from "zod"

export const addSubscriberSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  name: z.string().optional(),
  listIds: z.array(z.string()),
  emailVerified: z.boolean().optional(),
  metadata: z
    .array(
      z.object({
        key: z.string().min(1, "Key cannot be empty"),
        value: z.string().min(1, "Value cannot be empty"),
      })
    )
    .optional(),
})

export const editSubscriberSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  name: z.string().optional(),
  listIds: z.array(z.string()),
  emailVerified: z.boolean().optional(),
  metadata: z
    .array(
      z.object({
        key: z.string().min(1, "Key cannot be empty"),
        value: z.string().min(1, "Value cannot be empty"),
      })
    )
    .optional(),
})
