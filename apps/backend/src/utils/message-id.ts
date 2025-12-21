/**
 * Strips angle brackets from message IDs
 * Email message IDs are often wrapped in angle brackets like <abc123@smtp.server.com>
 * This function removes those brackets to get the clean message ID
 */
export function stripAngleBrackets(messageId: string): string {
  return messageId.replace(/^<|>$/g, "")
}
