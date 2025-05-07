import { RouterOutput } from "@/types"
import { ListSubscriber, Subscriber } from "backend"

export type PopulatedSubscriber = Subscriber & {
  ListSubscribers: (ListSubscriber & {
    List: {
      id: string
      name: string
    }
  })[]
}

export interface EditSubscriberDialogState {
  open: boolean
  subscriber: RouterOutput["subscriber"]["list"]["subscribers"][number] | null
}
