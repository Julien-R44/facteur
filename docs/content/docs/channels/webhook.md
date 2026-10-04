# Webhook Channel

The Webhook channel allows you to send notifications to any HTTP endpoint. This is useful for integrating with third-party services, custom APIs, or building notification bridges. This channel uses the `ky` HTTP client internally.

## Batching

This channel does **not support batching**. Each webhook is called individually. When targeting multiple webhooks, requests are sent sequentially.

## Configuration

```ts
import { createFacteur } from '@facteurjs/core'
import { webhookChannel } from '@facteurjs/core/channels/webhook'

export const facteur = createFacteur({
  discoverer: { searchDirectory: new URL('./notifications/', import.meta.url) },
  channels: {
    webhook: webhookChannel({
      name: 'webhook',

      // Define multiple named webhooks
      webhooks: {
        zapier: 'https://hooks.zapier.com/hooks/catch/123/abc',
        slack: 'https://hooks.slack.com/services/xxx/yyy/zzz',
        custom: 'https://api.example.com/webhooks/notifications',
      },
    }),
  },
})
```

## Configuration Options

- **`name`** (required): The channel name identifier
- **`webhooks`** (optional): An object mapping webhook names to URLs
- **`webhookUrl`** (optional): A single default webhook URL

Provide either `webhooks` or `webhookUrl`, not both. If both exist at runtime, `webhookUrl` takes precedence.

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
    },
  })
  .send()

// Or send to an arbitrary webhook URL
await facteur
  .notification(MyNotification)
  .via({
    webhook: {
      webhookUrl: 'https://custom-endpoint.example.com/notify',
    },
  })
  .send()
```

### Target Properties

When using named webhooks, include only the keys to call. **Current limitation:** keys are selected regardless of their boolean value. `custom: false` still calls `custom`; omit it to exclude it. This also applies to Slack and Discord.

When using arbitrary URLs:

- **`webhookUrl`**: The webhook URL to send to

## Message Features

When creating webhook notifications, you can customize the HTTP request:

```ts
import { Notification } from '@facteurjs/core/types'
import { WebhookMessage } from '@facteurjs/core/channels/webhook'

export default class WebhookNotification extends Notification<
  undefined,
  { orderId: number; customer: { name: string; email: string } }
> {
  asWebhookMessage() {
    return WebhookMessage.create()
      .setBody({
        event: 'order.shipped',
        orderId: this.params.orderId,
        customer: {
          name: this.params.customer.name,
          email: this.params.customer.email,
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

HTTP failures become `WebhookRequestException`, then the sender wraps channel failures in an aggregate error by default. Use `.throwOnError(false)` to inspect the underlying channel error:

```ts
import { WebhookRequestException } from '@facteurjs/core/channels/webhook'

const result = await facteur
  .notification(MyNotification)
  .via({ webhook: { zapier: true } })
  .throwOnError(false)
  .send()

for (const { error } of result.results) {
  if (error instanceof WebhookRequestException) {
    console.error('Webhook failed:', error.url, error.responseBody)
  }
}
```

## Building Custom Webhook Channels

The webhook channel is designed to be extended. Discord and Slack channels are built on top of it. You can create your own:

```ts
import { webhookChannel } from '@facteurjs/core/channels/webhook'

export function myServiceChannel(options: { webhookUrl: string }) {
  return webhookChannel({
    name: 'myService',
    webhookUrl: options.webhookUrl,
  })
}
```
