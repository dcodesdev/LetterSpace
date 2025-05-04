import { useEffect, useState } from "react"
import { useSearchParams } from "react-router"
import { useDebounce } from "./useDebounce"

type Pagination = {
  page: number
  perPage: number
  totalPages: number
}

export function usePagination(
  initialState: Pagination = {
    page: 1,
    perPage: 10,
    totalPages: 1,
  }
) {
  return useState<Pagination>(initialState)
}

type Key = "page" | "perPage" | "search" | "totalPages"

type Value<T extends Key> = T extends "page" | "perPage"
  ? number
  : T extends "totalPages"
    ? number | undefined
    : T extends "search"
      ? string
      : never

type Options = {
  perPage?: number
}

export function usePaginationWithQueryState(
  initialState: Options = {
    perPage: 10,
  }
) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "")

  const debouncedSearch = useDebounce(search, 500)

  useEffect(() => {
    setSearchParams((prev) => {
      const search = prev.get("search") || ""
      const hasChanged = search !== debouncedSearch
      if (!hasChanged) return prev

      if (!debouncedSearch) {
        prev.delete("page")
        prev.delete("search")
      } else {
        prev.set("search", debouncedSearch)
        prev.set("page", "1")
      }

      return prev
    })
  }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const setPagination = <T extends Key>(key: T, value: Value<T>) => {
    if (value === undefined) return

    if (key === "totalPages") {
      setTotalPages(value as number)
      return
    }

    if (key === "search") {
      setSearch(value as string)
      return
    }

    setSearchParams((prev) => {
      prev.set(key, value.toString())
      return prev
    })
  }

  return {
    pagination: {
      page: parseInt(searchParams.get("page") ?? "1"),
      perPage: parseInt(
        searchParams.get("perPage") ?? initialState.perPage?.toString() ?? "10"
      ),
      totalPages,
      search,
      searchQuery: searchParams.get("search") ?? "",
    },
    setPagination,
  }
}
