import { router } from "../trpc"
import { createOrganization } from "./mutation"

export const organizationRouter = router({
  create: createOrganization,
})
