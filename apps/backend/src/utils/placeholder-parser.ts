interface SubscriberPlaceholderData {
  email: string
  name?: string
}

interface CampaignPlaceholderData {
  name: string
  subject?: string
}

interface OrganizationPlaceholderData {
  name: string
}

export interface PlaceholderData {
  subscriber: SubscriberPlaceholderData
  campaign: CampaignPlaceholderData
  organization: OrganizationPlaceholderData
  unsubscribe_url: string
  current_date?: string
}

export type PlaceholderDataKey =
  | `subscriber.${keyof SubscriberPlaceholderData}`
  | `campaign.${keyof CampaignPlaceholderData}`
  | `organization.${keyof OrganizationPlaceholderData}`
  | `unsubscribe_url`
  | `current_date`

export function replacePlaceholders(
  template: string,
  data: Partial<Record<PlaceholderDataKey, string>>
): string {
  let result = template
  for (const key in data) {
    const placeholderRegex = new RegExp(
      `{{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*}}`,
      "g"
    )
    const value = data[key as PlaceholderDataKey]
    if (value !== undefined) {
      result = result.replace(placeholderRegex, value)
    }
  }
  return result
}
