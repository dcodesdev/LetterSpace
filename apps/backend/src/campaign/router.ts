import { router } from "../trpc"
import {
  createCampaign,
  updateCampaign,
  deleteCampaign,
  startCampaign,
  cancel,
  sendTestEmail,
  duplicateCampaign,
} from "./mutation"
import { getCampaign, listCampaigns } from "./query"

export const campaignRouter = router({
  create: createCampaign,
  update: updateCampaign,
  delete: deleteCampaign,
  get: getCampaign,
  list: listCampaigns,
  start: startCampaign,
  cancel,
  sendTestEmail,
  duplicate: duplicateCampaign,
})
