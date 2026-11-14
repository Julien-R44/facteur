# Creating Notifications

A notification extends `Notification` from `@facteurjs/core/types`. Its first generic is the recipient type, and its second is the parameter object. Import the message builders from the channel packages you use.

```ts
import { Notification, type NotificationOptions } from '@facteurjs/core/types'
import { TwilioMessage } from '@facteurjs/core/channels/twilio'
import type { User } from './user.js'

export default class InvoicePaidNotification extends Notification<User, { amount: number }> {
  static options: NotificationOptions<User> = {
    name: 'Invoice Paid',
    identifier: 'invoice-paid',
    category: 'billing',
    tags: ['invoice'],
    deliverBy: { twilio: { if: ({ to }) => Boolean(to.phoneNumber) } },
  }

  asTwilioMessage() {
    return TwilioMessage.create().setBody(`Invoice of $${this.params.amount} paid.`)
  }
}
```

Save the class in `invoice_paid_notification.ts` for automatic discovery. `name` is a display label; `identifier` is used for preferences and defaults to the class name. Neither automatically sets the database message's `type` or `tags`: set those on `DatabaseMessage` explicitly.

## Recipients and targets

```ts
const result = await facteur
  .notification(InvoicePaidNotification)
  .to(user)
  .params({ amount: 100 })
  .throwOnError(false)
  .send()
```

`user.notificationTargets()` provides destinations for each channel. A message method may read `this.notifiable`, `this.params` and `this.tenantId`, or accept `{ to, params, tenantId }` as its argument. It can be async; returning no message at runtime skips that channel. Channels disabled by `deliverBy` or lacking a resolved target are skipped.

`.via({ twilio: { to: '+33612345678' } })` selects explicit channels/targets. `.via({ twilio: true })` uses the recipient's target. **`via()` replaces `deliverBy` and bypasses preferences**, so reserve it for intentional overrides.

The result contains `success`, `failed` and `results` (each result has `channel`, `status` and optionally `error`). In normal delivery, counts are channel deliveries, not recipients. Failed channel sends throw an `E_SEND_NOTIFICATION_FAILED` aggregate by default. `.throwOnError(false)` returns channel failures instead; errors before channel sending, such as a throwing `beforeSend()`, can still reject.

See [Bulk Sending](./bulk-sending.md) for arrays and async iterables.

## Anonymous notifications

Use `Notification<undefined>` for delivery without a recipient, and provide explicit targets with `via()`:

```ts
import { Notification } from '@facteurjs/core/types'
import { WebhookMessage } from '@facteurjs/core/channels/webhook'

class DeploymentNotification extends Notification<undefined> {
  asWebhookMessage() {
    return WebhookMessage.create().setBody({ event: 'deployment.completed' })
  }
}

await facteur
  .notification(DeploymentNotification)
  .via({ webhook: { webhookUrl: 'https://example.com/deployments' } })
  .send()
```

This assumes a `webhook` channel is configured. Non-anonymous classes require `.to()`, anonymous classes require `.via()`, and classes with required parameters require `.params()` before TypeScript exposes `.send()`.

## Lifecycle hooks

For each recipient in normal delivery, Facteur constructs the class, awaits `beforeSend()`, then awaits `shouldSend()`. Returning `false` from `shouldSend()` skips delivery and `afterSend()`.

```ts
beforeSend() {
  // Load data needed by your message builders.
}

shouldSend() {
  return this.params.amount > 0
}

afterSend() {
  // Runs after channel results have been collected, including failed sends.
}
```

`afterSend()` is not a success-only callback: it runs before an aggregate channel failure is thrown, and can also run when all channels are skipped. Use [Events](./deep/events.md) if you need the delivery results. Native driver batching currently does not run `afterSend()` or notification-level events; it emits message-level events instead. Fakes record intent, not real channel delivery (see [Testing](./testing.md)).

## Critical notifications

Add `critical: true` to the static options object to bypass preferences for security or transactional messages. This does not override a `deliverBy: false` entry, a false `deliverBy.if` condition, or a missing target.
