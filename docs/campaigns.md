# Campaigns

A campaign is one newsletter send: content, a subject, a template, and the lists it goes to.

## Send a campaign

1. `campaign.create { title, description?, organizationId }` — starts in `DRAFT`.
2. `campaign.update` — set `subject`, `content`, `templateId`, `listIds`, `openTracking`, `scheduledAt`. Only `DRAFT` campaigns can be updated; anything else returns `BAD_REQUEST`.
3. `campaign.sendTestEmail { campaignId, organizationId, email }` — sends one copy with a `[Test]` subject prefix. Placeholders are *not* substituted in a test email.
4. `campaign.start { id, organizationId }`.

`campaign.start` refuses unless all of these hold:

- status is `DRAFT`
- SMTP settings exist for the organization
- email delivery settings exist
- `subject` is set
- `content` is not empty
- at least one list is attached, with at least one subscribed recipient
- `baseURL` is set in general settings

## Statuses

| Status | Meaning |
| --- | --- |
| `DRAFT` | Editable. The only status you can start from |
| `SCHEDULED` | `start` was called with a future `scheduledAt` |
| `CREATING` | Messages are being generated, 100 subscribers per pass |
| `SENDING` | Every message exists; the sender cron is working through them |
| `COMPLETED` | No message is left queued or retrying |
| `CANCELLED` | Cancelled by hand |

`start` picks `SCHEDULED` when `scheduledAt` is in the future and `CREATING` otherwise. Nothing in the codebase promotes a `SCHEDULED` campaign to `CREATING`, so a scheduled campaign stays parked until you cancel it and start it again without a schedule. Message generation and delivery are covered in [sending.md](sending.md).

## Cancel

`campaign.cancel` works from `CREATING`, `SENDING` or `SCHEDULED`. It marks the campaign `CANCELLED` and flips every `QUEUED`, `PENDING` or `RETRYING` message to `CANCELLED`. Messages already handed to SMTP are not recalled.

## Duplicate

`campaign.duplicate` copies title (prefixed `Copy of `), description, subject, content, template, lists and `openTracking` into a new `DRAFT`. Messages and stats are not copied.

## Delete

`campaign.delete` deletes the campaign's messages and then the campaign, in one transaction.

## Read

`campaign.list` paginates with `search` across title, description and subject. `campaign.get` returns the campaign plus per-list active subscriber counts, a deduplicated `uniqueRecipientCount`, and stats: total, queued, pending, sent, failed, processed, opened, clicked, plus open and click rate as percentages of sent.

## Content

Content is HTML written in the campaign editor. It can use every placeholder in [placeholders.md](placeholders.md) and the `@TRACK` link suffix from [tracking.md](tracking.md). `openTracking` (default true) controls the open pixel.
