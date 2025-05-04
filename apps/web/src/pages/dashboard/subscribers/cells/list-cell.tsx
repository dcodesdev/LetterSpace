import { memo, useState } from "react"
import {
  Button,
  Badge,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Switch,
  cn,
} from "@repo/ui"
import { PopulatedSubscriber } from "../page"
import { trpc } from "@/trpc"
import { toast } from "sonner"
import { ListSubscriber } from "backend"
import { displayDate } from "backend/shared"

interface ListCellProps {
  subscriber: PopulatedSubscriber
  organizationId: string
}

export const ListCell = memo(
  ({ subscriber, organizationId }: ListCellProps) => {
    const [open, setOpen] = useState(false)

    const lists = subscriber.ListSubscribers

    const utils = trpc.useUtils()

    const onOpenChange = (open: boolean) => {
      setOpen(open)

      if (!open) {
        utils.subscriber.list.invalidate()
      }
    }

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="hover:bg-transparent">
            <Badge variant="secondary" className="rounded-sm">
              {lists?.length ?? 0} list{lists?.length === 1 ? "" : "s"}
            </Badge>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lists for {subscriber.name}</DialogTitle>
            <DialogDescription>Manage subscription status</DialogDescription>
          </DialogHeader>
          {subscriber.ListSubscribers.map((list) => (
            <ListItem
              key={list.id}
              list={list}
              organizationId={organizationId}
            />
          ))}
        </DialogContent>
      </Dialog>
    )
  }
)

interface ListItemProps {
  list: ListSubscriber & {
    List: {
      id: string
      name: string
    }
  }
  organizationId: string
}

const ListItem = memo(({ list, organizationId }: ListItemProps) => {
  const [subbed, setSubbed] = useState(!list.unsubscribedAt)

  const toggleSubscription = trpc.subscriber.unsubscribeToggle.useMutation({
    onError: (error) => {
      toast.error(error.message)
      setSubbed(!subbed)
    },
  })

  const onChange = async () => {
    setSubbed((prev) => !prev) // optimistic update

    toggleSubscription.mutate({
      listSubscriberId: list.id,
      organizationId,
    })
  }

  return (
    <div key={list.id} className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-bold">{list.List.name}</p>
            <small
              className={cn(
                "text-xs font-medium",
                !subbed && "text-destructive"
              )}
            >
              {!subbed ? "Unsubscribed" : "Subscribed"}
            </small>
            <p className="text-sm text-muted-foreground">
              Added {displayDate(list.createdAt)}
            </p>
          </div>
          <Switch checked={subbed} onCheckedChange={onChange} />
        </div>
        <div className="text-sm text-muted-foreground">
          Last updated: {list.updatedAt ? displayDate(list.updatedAt) : "Never"}
        </div>
      </div>
    </div>
  )
})
