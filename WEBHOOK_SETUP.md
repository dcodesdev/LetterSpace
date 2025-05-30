# Webhook Setup Guide

This guide explains how to set up webhooks in LetterSpace to receive SMTP server events and automatically update message statuses.

## Overview

LetterSpace's webhook system allows you to receive real-time notifications from your SMTP provider about email delivery events (sent, opened, clicked, bounced, etc.). This enables automatic status updates for your email campaigns.

## Setting Up Webhooks

### 1. Access Webhook Settings

1. Go to **Settings** → **Webhooks** in your LetterSpace dashboard
2. Click **Add Webhook** to create a new webhook

### 2. Configure Webhook

Fill in the following information:

- **Name**: A descriptive name for your webhook (e.g., "Resend Webhook")
- **URL**: Your SMTP provider's webhook URL (e.g., `https://api.resend.com/webhooks`)
- **Authorization Code** (Optional): JavaScript code to verify webhook authenticity
- **Transform Code** (Optional): JavaScript code to transform webhook payload
- **Active**: Enable/disable the webhook

### 3. Get Your Webhook URL

After creating the webhook, you'll get a unique webhook URL like:

```
https://your-domain.com/webhook/webhook-id-here
```

Copy this URL and configure it in your SMTP provider's webhook settings.

## Authorization Code

The authorization code is JavaScript that runs to verify incoming webhook requests. It has access to the `request` object containing headers, body, query, and params.

### Example for Resend:

```javascript
// Verify Resend webhook signature
const signature = request.headers["resend-signature"]
const secret = "your-webhook-secret"
const payload = JSON.stringify(request.body)

// Implement signature verification logic
// Return true to allow, false to deny
return signature === expectedSignature
```

### Example for SendGrid:

```javascript
// Verify SendGrid webhook signature
const signature = request.headers["x-twilio-email-event-webhook-signature"]
const timestamp = request.headers["x-twilio-email-event-webhook-timestamp"]

// Implement SendGrid signature verification
return verifySignature(signature, timestamp, request.body)
```

## Transform Code

The transform code converts your SMTP provider's webhook payload into LetterSpace's expected format. It must return an object with `messageId` and `event` fields.

### Example for Resend:

```javascript
// Transform Resend webhook payload
return {
  messageId: payload.data.message_id,
  event: payload.type, // 'email.sent', 'email.delivered', etc.
  reason: payload.data.reason,
}
```

### Example for SendGrid:

```javascript
// Transform SendGrid webhook payload
// SendGrid sends arrays of events
const events = payload
const event = events[0] // Process first event

return {
  messageId: event.sg_message_id,
  event: event.event, // 'delivered', 'open', 'click', etc.
  reason: event.reason,
}
```

### Example for Mailgun:

```javascript
// Transform Mailgun webhook payload
return {
  messageId: payload["message-id"],
  event: payload.event, // 'delivered', 'opened', 'clicked', etc.
  reason: payload.reason || payload.description,
}
```

## Supported Events

LetterSpace recognizes the following event types:

- **delivered/sent**: Email was successfully delivered
- **opened/open**: Email was opened by recipient
- **clicked/click**: Link in email was clicked
- **bounced/bounce/failed**: Email bounced or failed to deliver
- **complained/complaint/spam**: Recipient marked email as spam

## SMTP Provider Examples

### Resend

1. Go to Resend Dashboard → Webhooks
2. Add webhook endpoint: `https://your-domain.com/webhook/your-webhook-id`
3. Select events: `email.sent`, `email.delivered`, `email.bounced`, etc.

### SendGrid

1. Go to SendGrid → Settings → Mail Settings → Event Webhook
2. Set HTTP POST URL: `https://your-domain.com/webhook/your-webhook-id`
3. Select events: Delivered, Opened, Clicked, Bounced, etc.

### Mailgun

1. Go to Mailgun Dashboard → Webhooks
2. Add webhook URL: `https://your-domain.com/webhook/your-webhook-id`
3. Select events: delivered, opened, clicked, permanent_fail, etc.

## Testing

You can test your webhook by:

1. Sending a test email campaign
2. Checking the webhook logs in your SMTP provider
3. Verifying message status updates in LetterSpace

## Troubleshooting

### Webhook Not Receiving Events

- Check if webhook is active in LetterSpace
- Verify webhook URL is correctly configured in SMTP provider
- Check authorization code for errors

### Events Not Updating Message Status

- Verify transform code returns correct `messageId` and `event`
- Check that `messageId` matches the one stored in LetterSpace
- Ensure event names match supported event types

### Authorization Failures

- Check authorization code logic
- Verify webhook secrets and signatures
- Review request headers and payload format
