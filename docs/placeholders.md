# Placeholders

`{{key}}` markers in campaign or template HTML are replaced per recipient when the message is built.

## Available keys

| Placeholder | Value |
| --- | --- |
| `{{subscriber.email}}` | Recipient's email |
| `{{subscriber.name}}` | Recipient's name; omitted when the subscriber has none |
| `{{subscriber.metadata.<key>}}` | Value of that metadata key for the recipient |
| `{{campaign.name}}` | Campaign title |
| `{{campaign.subject}}` | Campaign subject |
| `{{organization.name}}` | Organization name |
| `{{unsubscribe_link}}` | Per-recipient unsubscribe URL |
| `{{current_date}}` | Build date, `YYYY-MM-DD` (`en-CA` locale) |

Whitespace inside the braces is allowed: `{{ subscriber.email }}` works the same.

Anything with no value is left in the email verbatim — an unknown key, or `{{subscriber.name}}` for a subscriber with no name.

## Example

```html
<p>Hi {{subscriber.name}},</p>
<p>Here is the {{campaign.name}} for {{current_date}}.</p>
<p><a href="{{unsubscribe_link}}">Unsubscribe</a></p>
```

## Where substitution happens

Only in `processQueuedCampaigns`, on the already-template-wrapped body, before link tracking. That means:

- The subject line is **not** processed. Placeholders in a subject are sent literally.
- `campaign.sendTestEmail` skips substitution, so a test email shows the raw `{{...}}` markers.

## The unsubscribe link

`{{unsubscribe_link}}` expands to `<baseURL>/unsubscribe?sid=<subscriberId>&cid=<campaignId>&mid=<messageId>`, using the `baseURL` from general settings. The editor has a button that inserts the placeholder for you. See [unsubscribes.md](unsubscribes.md).

Implementation: `apps/backend/src/utils/placeholder-parser.ts`.
