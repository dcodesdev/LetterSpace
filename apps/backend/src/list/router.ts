import { router } from "../trpc"
import { createList, updateList, deleteList } from "./mutation"
import { getList, getLists } from "./query"

export const listRouter = router({
  create: createList,
  update: updateList,
  delete: deleteList,
  get: getList,
  list: getLists,
})
