import { z } from "zod"

export const campaignSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  subject: z.string().optional(),
  templateId: z
    .string()
    .optional()
    .transform((val) => (val === "none" ? null : val)),
  listIds: z.array(z.string()),
  content: z.string().optional(),
  openTracking: z.boolean().optional(),
})

export type UpdateCampaignOptions = {
  onSuccess?: () => void
}
