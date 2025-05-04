import { router } from "../trpc"
import { createTemplate, updateTemplate, deleteTemplate } from "./mutation"
import { getTemplate, listTemplates } from "./query"

export const templateRouter = router({
  create: createTemplate,
  update: updateTemplate,
  delete: deleteTemplate,
  get: getTemplate,
  list: listTemplates,
})
