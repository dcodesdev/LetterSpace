import { cn } from "@repo/ui"
import { MessageStatus } from "backend"

const statusConfig: Record<
  MessageStatus,
  { label: string; className: string }
> = {
  QUEUED: {
    label: "Queued",
    className:
      "bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground",
  },
  PENDING: {
    label: "Pending",
    className:
      "bg-secondary text-secondary-foreground dark:bg-secondary dark:text-secondary-foreground",
  },
  SENT: {
    label: "Sent",
    className:
      "bg-success text-success-foreground dark:bg-success dark:text-success-foreground",
  },
  FAILED: {
    label: "Failed",
    className:
      "bg-destructive text-destructive-foreground dark:bg-destructive dark:text-destructive-foreground",
  },
  OPENED: {
    label: "Opened",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  CLICKED: {
    label: "Clicked",
    className:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  },
  RETRYING: {
    label: "Retrying",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
}

interface MessageStatusBadgeProps {
  status: MessageStatus
  className?: string
}

export function MessageStatusBadge({
  status,
  className,
}: MessageStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
