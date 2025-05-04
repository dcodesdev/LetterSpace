import { createContext } from "react"
import { UseFormReturn } from "react-hook-form"
import { z } from "zod"
import { campaignSchema, UpdateCampaignOptions } from "./schema"
import { AppRouter } from "backend"
import { GetTRPCQueryResult } from "@/types"

type CampaignContextType = {
  form: UseFormReturn<z.infer<typeof campaignSchema>>
  campaignQuery: GetTRPCQueryResult<AppRouter["campaign"]["get"]>
  isEditable: boolean
  updateCampaign: (options?: UpdateCampaignOptions) => void
  updatePending: boolean
}

export const CampaignContext = createContext<CampaignContextType | null>(null)
