import { createContext } from "react"
import { UseFormReturn } from "react-hook-form"
import { AppRouter } from "backend"
import { z } from "zod"
import { GetTRPCQueryResult } from "@/types"
import { UpdateCampaignOptions, campaignSchema } from "./schema"

type CampaignContextType = {
  form: UseFormReturn<z.infer<typeof campaignSchema>>
  campaignQuery: GetTRPCQueryResult<AppRouter["campaign"]["get"]>
  isEditable: boolean
  updateCampaign: (options?: UpdateCampaignOptions) => void
  updatePending: boolean
}

export const CampaignContext = createContext<CampaignContextType | null>(null)
