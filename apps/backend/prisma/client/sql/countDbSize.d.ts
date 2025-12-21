import * as $runtime from "../runtime/library"

/**
 * @param text
 */
export const countDbSize: (text: string) => $runtime.TypedSql<countDbSize.Parameters, countDbSize.Result>

export namespace countDbSize {
  export type Parameters = [text: string]
  export type Result = {
    organization_id: string
    organization_name: string
    campaign_count: bigint | null
    template_count: bigint | null
    message_count: bigint | null
    subscriber_count: bigint | null
    list_count: bigint | null
    webhook_log_count: bigint | null
    total_size_mb: $runtime.Decimal | null
  }
}
