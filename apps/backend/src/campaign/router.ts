import { router } from "../trpc"
import {
  cancelCampaign,
  createCampaign,
  deleteCampaign,
  duplicateCampaign,
  sendTestEmail,
  startCampaign,
  updateCampaign,
} from "./mutation"
import { getCampaign, listCampaigns } from "./query"

export const campaignRouter = router({
  create: createCampaign,
  update: updateCampaign,
  delete: deleteCampaign,
  get: getCampaign,
  list: listCampaigns,
  start: startCampaign,
  cancel: cancelCampaign,
  sendTestEmail,
  duplicate: duplicateCampaign,
})
