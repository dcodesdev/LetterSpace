"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui"

// Values from prisma schema
const messageStatuses = [
  "QUEUED",
  "PENDING",
  "SENT",
  "AWAITING_WEBHOOK",
  "OPENED",
  "CLICKED",
  "FAILED",
  "RETRYING",
  "CANCELLED",
  "COMPLAINED",
] as const

export type MessageStatus = (typeof messageStatuses)[number]

interface MessageStatusFilterProps {
  selectedStatus: MessageStatus | undefined
  onStatusChange: (status: MessageStatus | undefined) => void
}

export function MessageStatusFilter({
  selectedStatus,
  onStatusChange,
}: MessageStatusFilterProps) {
  const handleValueChange = (value: string) => {
    if (value === "ALL_STATUSES") {
      onStatusChange(undefined)
    } else {
      onStatusChange(value as MessageStatus)
    }
  }

  return (
    <Select
      value={selectedStatus ?? "ALL_STATUSES"}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Filter by status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL_STATUSES">All Statuses</SelectItem>
        {messageStatuses.map((status) => (
          <SelectItem key={status} value={status}>
            {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
