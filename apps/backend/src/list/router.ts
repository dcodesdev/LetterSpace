import { router } from "../trpc"
import { createList, deleteList, updateList } from "./mutation"
import { getList, getLists } from "./query"

export const listRouter = router({
  create: createList,
  update: updateList,
  delete: deleteList,
  get: getList,
  list: getLists,
})
