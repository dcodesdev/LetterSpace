import { Input } from "@repo/ui"
import { usePaginationWithQueryState } from "@/hooks/usePagination"

export const ListSearch = () => {
  const { pagination, setPagination } = usePaginationWithQueryState()

  return (
    <Input
      placeholder="Search lists..."
      value={pagination.search}
      onChange={(event) => setPagination("search", event.target.value)}
      className="max-w-sm"
    />
  )
}
