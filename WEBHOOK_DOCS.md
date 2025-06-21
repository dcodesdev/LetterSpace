# LetterSpace Webhook Documentation

## Overview

LetterSpace's webhook system enables real-time status updates for email campaigns by receiving events from SMTP providers. When your SMTP service (Resend, SendGrid, Mailgun, etc.) sends webhook notifications about email events, LetterSpace automatically updates the corresponding message statuses.

## How It Works

1. **Message Sending**: LetterSpace sends emails via SMTP and stores the `messageId` returned by the SMTP server
2. **Webhook Registration**: You configure webhooks in LetterSpace and provide the webhook URL to your SMTP provider
3. **Event Processing**: When email events occur (delivery, opens, clicks, bounces), your SMTP provider sends webhook notifications
4. **Status Updates**: LetterSpace processes these webhooks and updates message statuses in real-time

## Accepted Event Types

LetterSpace recognizes the following event types and their aliases:

| Primary Event | Aliases             | Message Status | Description                                   |
| ------------- | ------------------- | -------------- | --------------------------------------------- |
| `delivered`   | `sent`              | `SENT`         | Email was successfully delivered to recipient |
| `opened`      | `open`              | `OPENED`       | Email was opened by recipient                 |
| `clicked`     | `click`             | `CLICKED`      | Link in email was clicked                     |
| `bounced`     | `bounce`, `failed`  | `FAILED`       | Email bounced or failed to deliver            |
| `complained`  | `complaint`, `spam` | `COMPLAINED`   | Recipient marked email as spam                |

## Webhook Configuration

### 1. Basic Settings

- **Name**: Descriptive name for the webhook
- **URL**: Your SMTP provider's webhook endpoint URL
- **Active**: Enable/disable the webhook

### 2. Authorization Code (Optional)

JavaScript code that validates incoming webhook requests. Has access to:

- `headers`: HTTP request headers
- `body`: Request payload
- `query`: URL query parameters
- `params`: URL path parameters

Must return `true` to allow the request, `false` to deny.

### 3. Transform Code (Optional)

JavaScript code that converts your SMTP provider's payload format to LetterSpace's expected format. Has access to:

- `payload`: The webhook payload from your SMTP provider
- `headers`: HTTP request headers
- `query`: URL query parameters

Must return an object with:

- `messageId`: The message ID that matches the one stored in LetterSpace
- `event`: One of the accepted event types listed above
- `reason` (optional): Error reason for failed/bounced emails

## SMTP Provider Examples

### Resend

```javascript
// Authorization Code
function authorize(headers, body, query, params) {
  const signature = headers["resend-signature"]
  const secret = "your-webhook-secret"
  // Implement Resend signature verification
  return verifyResendSignature(signature, secret, body)
}

// Transform Code
function transform(payload, headers, query) {
  return {
    messageId: payload.data.message_id,
    event: payload.type.replace("email.", ""), // 'email.delivered' -> 'delivered'
    reason: payload.data.reason,
  }
}
```

### SendGrid

```javascript
// Authorization Code
function authorize(headers, body, query, params) {
  const signature = headers["x-twilio-email-event-webhook-signature"]
  const timestamp = headers["x-twilio-email-event-webhook-timestamp"]
  // Implement SendGrid signature verification
  return verifySendGridSignature(signature, timestamp, body)
}

// Transform Code
function transform(payload, headers, query) {
  // SendGrid sends arrays of events
  const event = payload[0]
  return {
    messageId: event.sg_message_id,
    event: event.event, // 'delivered', 'open', 'click', etc.
    reason: event.reason,
  }
}
```

### Mailgun

```javascript
// Authorization Code
function authorize(headers, body, query, params) {
  const signature = headers["x-mailgun-signature"]
  const timestamp = headers["x-mailgun-timestamp"]
  const token = headers["x-mailgun-token"]
  // Implement Mailgun signature verification
  return verifyMailgunSignature(signature, timestamp, token, body)
}

// Transform Code
function transform(payload, headers, query) {
  return {
    messageId: payload["message-id"],
    event: payload.event, // 'delivered', 'opened', 'clicked', etc.
    reason: payload.reason || payload.description,
  }
}
```

## Technical Implementation

### Backend Flow

1. **Webhook Handler** (`apps/backend/src/webhook/handler.ts`):

   - Validates webhook exists and is active
   - Runs authorization code if provided
   - Runs transform code to normalize payload
   - Finds message by `messageId`
   - Updates message status based on event type

2. **Message Sending** (`apps/backend/src/cron/sendMessages.ts`):

   - Sends email via SMTP
   - Stores returned `messageId` in database
   - This `messageId` is used to match webhook events

3. **Database Schema** (`apps/backend/prisma/schema.prisma`):
   - `Message.messageId`: Stores SMTP server's message ID
   - `Message.status`: Updated by webhook events
   - `Webhook` table: Stores webhook configurations

### Frontend Components

- **Webhook Settings** (`apps/web/src/pages/dashboard/settings/webhook-settings.tsx`): Main webhook management interface
- **Webhook Form** (`apps/web/src/pages/dashboard/settings/webhook-form.tsx`): Create/edit webhook form with event type reference

## Security Considerations

1. **Authorization Code**: Always implement proper signature verification for your SMTP provider
2. **HTTPS Only**: Webhook URLs should use HTTPS
3. **Timeout Protection**: Authorization and transform code have 5-second timeout limits
4. **Sandbox Environment**: Code runs in isolated VM2 sandbox

## Troubleshooting

### Common Issues

1. **Events Not Updating Status**:

   - Check that `messageId` in webhook matches database
   - Verify event names match accepted types
   - Review transform code logic

2. **Authorization Failures**:

   - Verify signature verification logic
   - Check webhook secrets/keys
   - Review request headers format

3. **Transform Errors**:
   - Ensure return object has `messageId` and `event` fields
   - Check payload structure from SMTP provider
   - Verify event names are supported

### Debugging Tips

- Use browser dev tools to inspect webhook payloads
- Check server logs for webhook processing errors
- Test transform code with sample payloads
- Verify SMTP provider webhook configuration

## TODO: Important Features & Improvements

### High Priority

- [ ] **Webhook Logs/History**: Add logging system to track webhook calls, successes, failures
- [ ] **Webhook Testing**: Built-in webhook testing tool with sample payloads
- [ ] **Event Filtering**: Allow webhooks to specify which events they want to receive
- [ ] **Retry Mechanism**: Implement retry logic for failed webhook processing
- [ ] **Rate Limiting**: Add rate limiting for webhook endpoints to prevent abuse

### Medium Priority

- [ ] **Webhook Templates**: Pre-built templates for popular SMTP providers (Resend, SendGrid, Mailgun)
- [ ] **Payload Validation**: Schema validation for transform code return values
- [ ] **Multiple Webhooks**: Support multiple webhooks per organization with different configurations
- [ ] **Webhook Analytics**: Dashboard showing webhook performance, success rates, etc.
- [ ] **Conditional Processing**: Allow webhooks to have conditions (e.g., only process certain campaigns)

### Low Priority

- [ ] **Webhook Signing**: Generate and validate webhook signatures for outgoing requests
- [ ] **Custom Headers**: Allow adding custom headers to webhook requests
- [ ] **Webhook Forwarding**: Forward processed events to external systems
- [ ] **Batch Processing**: Handle multiple events in single webhook call
- [ ] **Event Transformation Pipeline**: Multi-step transformation with multiple functions

### Documentation & UX

- [ ] **Interactive Documentation**: In-app documentation with live examples
- [ ] **Setup Wizards**: Step-by-step setup guides for popular SMTP providers
- [ ] **Code Examples**: More comprehensive code examples for different providers
- [ ] **Video Tutorials**: Create video guides for webhook setup
- [ ] **Migration Guides**: Help users migrate from other email platforms

### Monitoring & Observability

- [ ] **Health Checks**: Webhook endpoint health monitoring
- [ ] **Performance Metrics**: Track webhook processing times, success rates
- [ ] **Error Alerting**: Notify users when webhooks consistently fail
- [ ] **Usage Statistics**: Show webhook usage patterns and trends
- [ ] **Audit Trail**: Complete audit log of all webhook-related changes

### Security Enhancements

- [ ] **IP Whitelisting**: Allow restricting webhook calls to specific IP ranges
- [ ] **Token-based Auth**: Alternative to signature-based authentication
- [ ] **Webhook Rotation**: Automatic webhook URL rotation for security
- [ ] **Encrypted Storage**: Encrypt sensitive webhook configuration data
- [ ] **Access Controls**: Role-based access for webhook management

### Advanced Features

- [ ] **Webhook Chaining**: Chain multiple webhooks together
- [ ] **Event Aggregation**: Combine multiple events before processing
- [ ] **Custom Event Types**: Allow users to define custom event types
- [ ] **Webhook Marketplace**: Community-contributed webhook configurations
- [ ] **GraphQL Webhooks**: Support GraphQL-based webhook queries

## API Reference

### Webhook Endpoint

```
POST /webhook/{webhookId}
```

### Expected Transform Output

```typescript
interface WebhookEvent {
  messageId: string // Must match Message.messageId in database
  event: string // One of: delivered, sent, opened, open, clicked, click, bounced, bounce, failed, complained, complaint, spam
  timestamp?: string // Optional event timestamp
  reason?: string // Optional error reason for failed events
}
```

### Authorization Function Signature

```typescript
function authorize(
  headers: Record<string, string>,
  body: any,
  query: Record<string, string>,
  params: Record<string, string>
): boolean
```

### Transform Function Signature

```typescript
function transform(
  payload: any,
  headers: Record<string, string>,
  query: Record<string, string>
): WebhookEvent
```
