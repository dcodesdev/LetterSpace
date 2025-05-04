import { z } from "zod"

export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  perPage: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
})

export type PaginationSchema = z.infer<typeof paginationSchema>
