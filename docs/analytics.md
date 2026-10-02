# Analytics

Two read-only procedures back the dashboard and the analytics page. Both require organization membership.

## Dashboard

```
POST /trpc/dashboard.getStats   { organizationId }
```

Window: the last 6 months. Returns:

| Key | Contents |
| --- | --- |
| `messageStats` | Message counts grouped by status |
| `recentCampaigns` | The 5 most recent `COMPLETED` campaigns with total and delivered message counts and a delivery rate |
| `subscriberGrowth` | Daily new-subscriber counts, accumulated onto the subscriber count from before the window |
| `dbSize` | Row counts per model and an approximate `total_size_mb` for the organization's text content |

`dbSize` sums the byte length of stored text — campaign, template and message bodies, subscriber and list fields, webhook log payloads. It is an estimate of content size, not the size of the database on disk.

## Analytics page

```
POST /trpc/stats.getStats   { organizationId }
```

Compares the last 30 days against the 30 days before that. Every group carries `thisMonth`, `lastMonth` and a `comparison` delta:

- `campaigns` and `completedCampaigns` — counts, plus `total`
- `openRate` — opened or clicked messages over messages created in the period, as a percentage
- `clickRate` — clicked messages, count and percentage
- `deliveryRate` — `SENT`/`OPENED`/`CLICKED` messages, count and percentage
- `messages` — `total`, `last30Days`, `lastPeriod`
- `recipients` — distinct subscribers messaged, all time and per period
- `subscribers` — `allTime` and `newThisMonth`
- `unsubscribed` — memberships whose `unsubscribedAt` falls in the period

Rate denominators count messages **created** in the period, while the numerators count messages **sent** in it. A campaign that spans the boundary skews both rates for that period.

Rates are percentages of processed messages, so they are computed against real sends rather than against every row, including cancelled ones. Status groupings are listed in [messages.md](messages.md).

## Per campaign

`campaign.get` returns stats for a single campaign — queued, pending, sent, failed, processed, opened, clicked, and open and click rates. See [campaigns.md](campaigns.md).

Because rates depend on opens and clicks being recorded, read them together with the caveats in [tracking.md](tracking.md).

Raw SQL for the distinct-recipient, growth and size queries lives in `apps/backend/prisma/sql/`.
