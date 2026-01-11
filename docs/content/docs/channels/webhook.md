# Webhook Channel

The Webhook channel allows you to send notifications to any HTTP endpoint. This is useful for integrating with third-party services, custom APIs, or building notification bridges. This channel uses the `ky` HTTP client internally.

## Batching

This channel does **not support batching**. Each webhook is called individually. When targeting multiple webhooks, requests are sent sequentially.

## Configuration

```ts
import { defineConfig } from 'facteur'
import { webhookChannel } from '@facteurjs/adonisjs/channels/webhook'

export default defineConfig({
  channels: {
    webhook: webhookChannel({
      name: 'webhook',

      // Define multiple named webhooks
      webhooks: {
        zapier: 'https://hooks.zapier.com/hooks/catch/123/abc',
        slack: 'https://hooks.slack.com/services/xxx/yyy/zzz',
        custom: 'https://api.example.com/webhooks/notifications',
      },

      // Or use a single default webhook
      webhookUrl: 'https://api.example.com/webhook',
    })
  },
})
```

## Configuration Options

- **`name`** (required): The channel name identifier
- **`webhooks`** (optional): An object mapping webhook names to URLs
- **`webhookUrl`** (optional): A single default webhook URL

You must provide either `webhooks` or `webhookUrl`.

## Targets

The Webhook channel targets specify which webhooks to call:

```ts
// Send to specific named webhooks
await facteur
  .notification(MyNotification)
  .via({
    webhook: {
      zapier: true,
      slack: true,
      custom: false, // This one won't be called
    }
  })
  .send()

// Or send to an arbitrary webhook URL
await facteur
  .notification(MyNotification)
  .via({
    webhook: {
      webhookUrl: 'https://custom-endpoint.example.com/notify'
    }
  })
  .send()
```

### Target Properties

When using named webhooks:
- **`[webhookName]: boolean`**: Set to `true` to send to that webhook

When using arbitrary URLs:
- **`webhookUrl`**: The webhook URL to send to

## Message Features

When creating webhook notifications, you can customize the HTTP request:

```ts
export default class WebhookNotification extends Notification {
  asWebhookMessage() {
    return WebhookMessage.create()
      .setBody({
        event: 'order.shipped',
        orderId: this.order.id,
        customer: {
          name: this.customer.name,
          email: this.customer.email,
        },
        timestamp: new Date().toISOString(),
      })
      .setHeader('X-Webhook-Secret', 'your-secret')
      .setHeader('X-Event-Type', 'order.shipped')
      .setQueryParameters({
        version: 'v1',
        format: 'json',
      })
  }
}
```

### Available Methods

- **`setBody(data)`**: Set the JSON body of the webhook request
- **`setHeader(name, value)`**: Add a custom HTTP header
- **`setQueryParameters(params)`**: Add query parameters to the webhook URL

## Error Handling

The webhook channel throws a `WebhookRequestException` when the HTTP request fails. You can catch and handle these errors:

```ts
try {
  await facteur.notification(MyNotification).via({ webhook: { zapier: true } }).send()
} catch (error) {
  if (error instanceof WebhookRequestException) {
    console.error('Webhook failed:', error.statusCode, error.body)
  }
}
```

## Building Custom Webhook Channels

The webhook channel is designed to be extended. Discord and Slack channels are built on top of it. You can create your own:

```ts
import { webhookChannel } from '@facteurjs/core/channels/webhook'

export function myServiceChannel(options: { apiKey: string; webhookUrl: string }) {
  return webhookChannel({
    name: 'myService',
    webhookUrl: options.webhookUrl,
  })
}
```
