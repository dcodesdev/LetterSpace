# Open and click tracking

Both features rewrite the email body when the message is built, and both need `baseURL` set in general settings. Trailing slashes on `baseURL` are stripped before any URL is built.

## Open tracking

Leave `openTracking` on (the default) and every message gets a 1×1 pixel appended:

```html
<img
  src="<baseURL>/img/<messageId>/img.png"
  alt=""
  width="1"
  height="1"
  style="display:none"
/>
```

`GET /img/:id/img.png` returns the pixel immediately with no-cache headers, then promotes the message from `SENT` or `AWAITING_WEBHOOK` to `OPENED`. Nothing happens if the campaign has `openTracking` off, or the message is in any other status — so an already `CLICKED` message is not walked back to `OPENED`.

Turn it off per campaign with `campaign.update { openTracking: false }`.

Opens are undercounted by design: mail clients that block remote images never load the pixel.

## Click tracking

Add the suffix `@TRACK` to a link in your campaign content:

```html
<a href="https://example.com/pricing@TRACK">See pricing</a>
```

When the message is built, `LinkTracker` (`apps/backend/src/lib/LinkTracker.ts`) strips the suffix, upserts a `TrackedLink` for that `(url, campaignId)` pair, and rewrites the href to `<baseURL>/t/<trackedLinkId>?sid=<subscriberId>`. Links without the suffix are left alone.

`GET /t/:id` looks up the tracked link, redirects to the original URL, and — when a `sid` query parameter names a subscriber — records a `Click` and promotes that subscriber's message for the campaign to `CLICKED`.

## Reading the numbers

`campaign.get` returns opened and clicked counts with open and click rates against sent. Organization-wide rates are in [analytics.md](analytics.md). When an SMTP provider webhook reports opens and clicks, those events set the same statuses — see [webhooks.md](webhooks.md).
