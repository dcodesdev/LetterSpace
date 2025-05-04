import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "react-router"
import { useDebounceValue } from "usehooks-ts"

export function useQueryState(queryKey: string, delay = 500) {
  const [queryParams, setQueryParams] = useSearchParams()
  const [queryState, setQueryState] = useState(queryParams.get(queryKey) ?? "")
  const [debouncedQuery] = useDebounceValue(queryState, delay)

  const setQuery = useCallback((query: string) => {
    setQueryState(query)
  }, [])

  useEffect(() => {
    setQueryParams({ [queryKey]: debouncedQuery })
  }, [debouncedQuery, setQueryParams, queryKey])

  return {
    query: queryState,
    setQuery,
    search: queryParams.get(queryKey) ?? "",
  }
}
