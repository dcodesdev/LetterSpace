import { Input } from "@repo/ui"
import { usePaginationWithQueryState } from "@/hooks/usePagination"

export const MessageSearch = () => {
  const { pagination, setPagination } = usePaginationWithQueryState()

  return (
    <Input
      placeholder="Search messages..."
      value={pagination.search}
      onChange={(event) => setPagination("search", event.target.value)}
      className="max-w-sm"
    />
  )
}
