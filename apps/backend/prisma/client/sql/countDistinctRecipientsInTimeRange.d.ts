import * as $runtime from "../runtime/library"

/**
 * @param text
 * @param timestamp
 * @param timestamp
 */
export const countDistinctRecipientsInTimeRange: (text: string, timestamp: Date, timestamp: Date) => $runtime.TypedSql<countDistinctRecipientsInTimeRange.Parameters, countDistinctRecipientsInTimeRange.Result>

export namespace countDistinctRecipientsInTimeRange {
  export type Parameters = [text: string, timestamp: Date, timestamp: Date]
  export type Result = {
    count: bigint | null
  }
}
