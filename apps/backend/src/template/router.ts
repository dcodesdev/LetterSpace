import { router } from "../trpc"
import { createTemplate, deleteTemplate, updateTemplate } from "./mutation"
import { getTemplate, listTemplates } from "./query"

export const templateRouter = router({
  create: createTemplate,
  update: updateTemplate,
  delete: deleteTemplate,
  get: getTemplate,
  list: listTemplates,
})
