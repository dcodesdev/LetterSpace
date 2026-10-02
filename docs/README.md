# LetterSpace docs

One file per feature. Each documents what the code does today.

| Doc                                | Covers                                                   |
| ---------------------------------- | -------------------------------------------------------- |
| [accounts.md](accounts.md)         | Signup, login, JWT sessions, organizations               |
| [lists.md](lists.md)               | Subscriber lists                                         |
| [subscribers.md](subscribers.md)   | Subscribers, metadata, list membership                   |
| [templates.md](templates.md)       | Reusable HTML wrappers around campaign content           |
| [campaigns.md](campaigns.md)       | Creating, starting, cancelling and duplicating campaigns |
| [sending.md](sending.md)           | The send pipeline: cron jobs, rate limits, retries       |
| [messages.md](messages.md)         | Per-recipient message records, statuses, resend          |
| [placeholders.md](placeholders.md) | `{{...}}` substitution in email content                  |
| [tracking.md](tracking.md)         | Open pixel and click tracking                            |
| [unsubscribes.md](unsubscribes.md) | Unsubscribe flow and double opt-in verification          |
| [webhooks.md](webhooks.md)         | Incoming delivery webhooks from your SMTP provider       |
| [rest-api.md](rest-api.md)         | API keys and the `/api` REST endpoints                   |
| [settings.md](settings.md)         | SMTP, email delivery, general settings                   |
| [analytics.md](analytics.md)       | Dashboard and analytics numbers                          |
| [maintenance.md](maintenance.md)   | Automatic cleanup of message bodies and webhook logs     |
| [testing.md](testing.md)           | Running and writing the backend test suite               |

Install and deploy instructions live in [apps/docs](../apps/docs/src/app/getting-started/page.mdx).
