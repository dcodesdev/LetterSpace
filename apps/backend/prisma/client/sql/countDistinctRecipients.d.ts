import * as $runtime from "../runtime/library";

/**
 * @param text
 */
export const countDistinctRecipients: (
  text: string,
) => $runtime.TypedSql<
  countDistinctRecipients.Parameters,
  countDistinctRecipients.Result
>;

export namespace countDistinctRecipients {
  export type Parameters = [text: string];
  export type Result = {
    count: bigint | null;
  };
}
