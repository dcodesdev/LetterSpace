import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui"
import { RouterOutput } from "@/types"

interface SubscriberDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscriber: RouterOutput["subscriber"]["get"] | null | undefined
}

export function SubscriberDetailsDialog({
  open,
  onOpenChange,
  subscriber,
}: SubscriberDetailsDialogProps) {
  if (!subscriber) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subscriber Details</DialogTitle>
          <DialogDescription>
            Viewing details for {subscriber.email}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <h3 className="text-lg font-medium">General Information</h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 mt-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-muted-foreground">
                  Name
                </dt>
                <dd className="mt-1 text-sm">{subscriber.name || "N/A"}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-muted-foreground">
                  Email
                </dt>
                <dd className="mt-1 text-sm">{subscriber.email}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-muted-foreground">
                  Email Verified
                </dt>
                <dd className="mt-1 text-sm">
                  {subscriber.emailVerified ? "Yes" : "No"}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-muted-foreground">
                  Created At
                </dt>
                <dd className="mt-1 text-sm">
                  {new Date(subscriber.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>

          {subscriber.Metadata && subscriber.Metadata.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mt-4">Metadata</h3>
              <Table className="mt-2">
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriber.Metadata.map((meta) => (
                    <TableRow key={meta.id}>
                      <TableCell>{meta.key}</TableCell>
                      <TableCell>{meta.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {subscriber.ListSubscribers &&
            subscriber.ListSubscribers.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mt-4">Lists</h3>
                <div className="mt-2 space-y-1">
                  {subscriber.ListSubscribers.map((listSub) => (
                    <div
                      key={listSub.List.id}
                      className="text-sm p-2 border rounded-md"
                    >
                      {listSub.List.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
