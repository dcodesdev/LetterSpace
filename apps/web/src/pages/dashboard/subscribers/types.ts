import { RouterOutput } from "@/types"

export interface EditSubscriberDialogState {
  open: boolean
  subscriber: RouterOutput["subscriber"]["list"]["subscribers"][number] | null
}
