import { router } from "../trpc"
import { createOrganization, updateOrganization } from "./mutation"
import { getOrganizationById } from "./query"

export const organizationRouter = router({
  create: createOrganization,
  update: updateOrganization,
  getById: getOrganizationById,
})
