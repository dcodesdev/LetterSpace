import { Skeleton } from "@repo/ui"

export const CardSkeleton = () => (
  <div className="grid gap-2">
    <Skeleton className="w-[150px] h-6" />
    <Skeleton className="w-[80px] h-4" />
  </div>
)
