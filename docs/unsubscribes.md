# Unsubscribes and email verification

## Unsubscribe flow

Put `{{unsubscribe_link}}` in your campaign or template. It renders as `<baseURL>/unsubscribe?sid=<subscriberId>&cid=<campaignId>&mid=<messageId>`. The web app serves that path and requires both `sid` and `cid`; a link missing either shows "Invalid URL".

Confirming calls the public procedure:

```
POST /trpc/subscriber.unsubscribe   { sid, cid? }
```

In one transaction it:

1. Sets `unsubscribedAt` on the subscriber's active memberships — only lists attached to that campaign when `cid` is given, otherwise every list.
2. Cancels the subscriber's `QUEUED`, `PENDING` and `RETRYING` messages for campaigns using those lists, with the error `Subscriber unsubscribed`.
3. Increments `unsubscribedCount` on the campaign when `cid` is given.

The procedure is public and takes an unauthenticated subscriber id, so anyone holding a subscriber id can unsubscribe that address. Unsubscribing an already-unsubscribed subscriber is a no-op that still returns success.

## Unsubscribe from the dashboard

```
POST /trpc/subscriber.unsubscribeToggle   { listSubscriberId, organizationId }
```

Toggles one membership. Unsubscribing cancels that subscriber's pending messages for campaigns using the list; resubscribing just clears `unsubscribedAt`.

Memberships are never deleted, so unsubscribes stay visible in the subscriber's list history and in the analytics counts.

## Who receives a campaign

Message building only picks subscribers with a `ListSubscriber` row where `unsubscribedAt` is null. Recipient counts shown on a campaign use the same filter.

## Double opt-in

Pass `doubleOptIn: true` to `POST /api/subscribers` ([rest-api.md](rest-api.md)). LetterSpace then generates a token valid for 24 hours, stores it on the subscriber with `emailVerified: false`, and sends `apps/backend/templates/verificationEmail.html` with `{{name}}`, `{{verificationLink}}` and `{{currentYear}}` filled in. The link is `<baseURL>/verify-email?token=<token>`.

The request returns 422 if SMTP settings, `baseURL`, or a sender address are missing.

A verification email is only sent when the subscriber is not already verified and any previous token has expired.

The page at `/verify-email` calls:

```
POST /trpc/subscriber.verifyEmail   { token }
```

which sets `emailVerified: true` and clears the token, or returns `NOT_FOUND` for an invalid or expired one.

`emailVerified` is recorded but not enforced: campaigns send to unverified subscribers too.
