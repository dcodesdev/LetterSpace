import * as $runtime from "../runtime/library"

/**
 * @param text
 * @param timestamp
 * @param timestamp
 */
export const subscriberGrowthQuery: (text: string, timestamp: Date, timestamp: Date) => $runtime.TypedSql<subscriberGrowthQuery.Parameters, subscriberGrowthQuery.Result>

export namespace subscriberGrowthQuery {
  export type Parameters = [text: string, timestamp: Date, timestamp: Date]
  export type Result = {
    date: Date | null
    count: bigint | null
  }
}
