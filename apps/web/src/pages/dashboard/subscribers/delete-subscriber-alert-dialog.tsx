import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui"

interface DeleteSubscriberAlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  subscriberToDelete: string | null
  isPending: boolean
}

export function DeleteSubscriberAlertDialog({
  open,
  onOpenChange,
  onConfirm,
  subscriberToDelete,
  isPending,
}: DeleteSubscriberAlertDialogProps) {
  const numSubscribers = subscriberToDelete?.split(",").length ?? 0
  const isMultiple = subscriberToDelete?.includes(",")

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            {isMultiple
              ? `This action cannot be undone. This will permanently delete ${
                  numSubscribers
                } subscribers and remove their data from our servers.`
              : "This action cannot be undone. This will permanently delete the subscriber and remove their data from our servers."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending
              ? "Deleting..."
              : isMultiple
                ? `Delete ${numSubscribers} subscribers`
                : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
