import { Pagination as UIPagination, PaginationContent, Button } from "@repo/ui"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

type PaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  hasNextPage: boolean
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  hasNextPage,
}: PaginationProps) {
  const totalButtons = 7

  const renderPageButton = (pageNumber: number) => (
    <Button
      key={pageNumber}
      variant={page === pageNumber ? "default" : "outline"}
      size="icon"
      onClick={() => onPageChange(pageNumber)}
    >
      {pageNumber}
    </Button>
  )

  const renderEllipsis = (key: string) => (
    <Button key={key} variant="outline" size="icon" disabled>
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  )

  const renderPaginationButtons = () => {
    const buttons = []

    if (totalPages <= totalButtons) {
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(renderPageButton(i))
      }
    } else {
      buttons.push(renderPageButton(1))

      if (page > 3) {
        buttons.push(renderEllipsis("start-ellipsis"))
      }

      let start = Math.max(2, page - 1)
      let end = Math.min(totalPages - 1, page + 1)

      if (page <= 3) {
        end = Math.min(totalPages - 1, totalButtons - 2)
      }

      if (page >= totalPages - 2) {
        start = Math.max(2, totalPages - (totalButtons - 2))
      }

      for (let i = start; i <= end; i++) {
        buttons.push(renderPageButton(i))
      }

      if (page < totalPages - 2) {
        buttons.push(renderEllipsis("end-ellipsis"))
      }

      buttons.push(renderPageButton(totalPages))
    }

    while (buttons.length < totalButtons) {
      buttons.push(
        <Button
          key={`filler-${buttons.length}`}
          variant="outline"
          size="icon"
          disabled
        >
          {" "}
        </Button>
      )
    }

    return buttons
  }

  return (
    <UIPagination className="select-none">
      <PaginationContent className="flex items-center justify-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous page</span>
        </Button>
        {renderPaginationButtons()}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={!hasNextPage}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next page</span>
        </Button>
      </PaginationContent>
    </UIPagination>
  )
}
