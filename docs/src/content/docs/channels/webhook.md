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

The options below are off by default. The [Slack](./slack.md) and [Discord](./discord.md) channels accept them too. [Security](#security) explains each one.

- **`signingSecret`** (optional): Standard Webhooks secret (`whsec_...`). The channel signs every request with it.
- **`httpsOnly`** (optional, default `false`): Rejects non-https URLs before any request.
- **`followRedirects`** (optional, default `true`): Follows HTTP redirects. `false` refuses them.
- **`timeout`** (optional, default `10000`): Request timeout in milliseconds. `false` disables it.
- **`fetch`** (optional): The `fetch` function that the channel uses for every request.

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
- **`signingSecret`** (optional): The signing secret for this send. It replaces the channel `signingSecret`.

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
- **`setId(id)`**: Set the `webhook-id` header of signed requests. See [Sign requests](#sign-requests).

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

## Security

### Sign requests

Set `signingSecret` to sign requests with [Standard Webhooks](https://www.standardwebhooks.com). Each signed request carries three headers:

- `webhook-id`: the message id.
- `webhook-timestamp`: the time of the attempt, in Unix seconds.
- `webhook-signature`: `v1,` followed by the base64 HMAC-SHA256 of `${id}.${timestamp}.${body}`. The key is the base64-decoded secret.

The channel serializes the body once and signs the exact bytes it sends. Any Standard Webhooks library can verify the requests.

Set the secret on the channel, in the targets of a send, or both. A target secret replaces the channel secret for that send. Use a target secret when each organization has its own URL and secret:

```ts
const facteur = createFacteur({
  channels: {
    webhook: webhookChannel({ name: 'webhook', webhooks: {} }),
  },
})

await facteur
  .notification(OrderShipped)
  .via({
    webhook: {
      webhookUrl: organization.webhookUrl,
      signingSecret: organization.webhookSecret, // whsec_...
    },
  })
  .send()
```

If the channel `signingSecret` is invalid, `webhookChannel()` throws `E_INVALID_WEBHOOK_SECRET`. If a target `signingSecret` is invalid, `send()` throws the same error before it makes any request.

By default, the channel generates the `webhook-id` once per message instance. Facteur's `retry` option resends the same message instance, so a retry keeps the same `webhook-id` with a new timestamp and a new signature. A new `send()` creates a new message with a new id. So does a queued job that rebuilds the notification. To keep one id across those, set it with `setId()`, for example from your event id:

```ts
asWebhookMessage() {
  return WebhookMessage.create().setId(`evt_${this.params.eventId}`).setBody({ ... })
}
```

### Restrict requests

```ts
webhookChannel({
  name: 'webhook',
  webhooks: {},
  httpsOnly: true,
  followRedirects: false,
  timeout: 5000,
})
```

- `httpsOnly: true` makes the channel check every target URL before the first request. If one URL is not https, `send()` throws `E_WEBHOOK_INSECURE_URL` and calls no endpoint.
- `followRedirects: false` stops the channel from following a 3xx response. The send fails with a `WebhookRequestException`, like any other non-2xx response.
- `timeout` aborts an HTTP request after this many milliseconds. Facteur's `retry.timeout` is a separate limit on each send attempt.

### Protect against SSRF

If your users provide webhook URLs, a URL can point to an internal service or to the cloud metadata endpoint `169.254.169.254`. Facteur has no built-in SSRF guard. Pass a `fetch` that blocks these requests.

A correct guard checks every IP that the hostname resolves to. It also checks IP literals and every redirect, and it connects to the IP that it checked. Otherwise, an attacker can use DNS rebinding. The attacker's DNS server returns a public IP for the check and a private IP for the connection.

We recommend [`guarded-fetch`](https://github.com/vercel-labs/guarded-fetch). Its undici dispatcher runs these checks each time it opens a connection. Pass the dispatcher to the native `fetch`:

```ts
import { getSharedGuardedDispatcher } from 'guarded-fetch'
import { webhookChannel } from '@facteurjs/core/channels/webhook'

const dispatcher = getSharedGuardedDispatcher()

webhookChannel({
  name: 'webhook',
  webhooks: {},
  httpsOnly: true,
  // guarded-fetch ships its own undici. Its types can differ from the types of Node's fetch.
  fetch: (input, init) => fetch(input, { ...init, dispatcher } as unknown as RequestInit),
})
```

With this `fetch`, the dispatcher refuses to connect to private, loopback, link-local, and CGNAT addresses. It also refuses IPv6 addresses that embed one of them. The same checks apply to every redirect.

Don't pass `guardedFetch` as `fetch`. The channel calls `fetch` with a `Request` object, and `guardedFetch` accepts only a URL.

To reject an unsafe URL when an organization saves it, call `assertUrlIsSafeToFetch(url, { httpsOnly: true })` from `guarded-fetch`. Keep the dispatcher too, because the DNS record can change after the save.

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
