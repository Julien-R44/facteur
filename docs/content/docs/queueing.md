# Queueing Notifications

For high-volume applications or when you need to offload notification delivery from your main request cycle, Facteur supports queueing notifications for background processing.

When you queue a notification, Facteur creates a separate job for each recipient × channel combination. For example, sending a notification to 3 users via email and SMS creates 6 jobs:

```
3 users × 2 channels = 6 jobs
```

This ensures reliable delivery and allows for independent retries per recipient/channel.

## Installation

First, install the queue adapter package. Currently, Facteur provides an adapter for [@boringnode/queue](https://github.com/boringnode/queue):

:::codegroup

```sh
// title: npm
npm i @facteurjs/adapter-boring-queue @boringnode/queue
```

```sh
// title: pnpm
pnpm add @facteurjs/adapter-boring-queue @boringnode/queue
```

```sh
// title: yarn
yarn add @facteurjs/adapter-boring-queue @boringnode/queue
```

:::

## Configuration

Configure the queue adapter when creating your Facteur instance:

```ts
import { createFacteur } from '@facteurjs/core'
import { BoringNodeQueueAdapter } from '@facteurjs/adapter-boring-queue'

const facteur = createFacteur({
  discoverer: {
    searchDirectory: new URL('./src', import.meta.url),
  },
  channels: {
    email: emailChannel({ /* ... */ }),
    sms: smsChannel({ /* ... */ }),
  },
  // Add the queue adapter
  queueAdapter: new BoringNodeQueueAdapter({
    defaultQueue: 'notifications', // Optional, defaults to 'notifications'
  }),
})
```

## Queueing notifications

There are two ways to queue notifications:

### Option 1: Via the notification class

Add `queue: true` to your notification's options to always queue it:

```ts
export class OrderShippedNotification extends Notification<User, { trackingNumber: string }> {
  static options: NotificationOptions<User> = {
    name: 'Order Shipped',
    deliverBy: {
      email: true,
      sms: true,
    },
    // This notification will always be queued
    queue: true,
  }

  asEmailMessage() {
    return EmailMessage.create()
      .setSubject('Your order has shipped!')
      .setBody(`Tracking number: ${this.params.trackingNumber}`)
  }

  asSmsMessage() {
    return SmsMessage.create()
      .setBody(`Your order shipped! Track: ${this.params.trackingNumber}`)
  }
}
```

When you call `.send()`, it will automatically queue instead of sending immediately:

```ts
// This queues the notification (because queue: true is set)
await facteur
  .notification(OrderShippedNotification)
  .to(user)
  .params({ trackingNumber: 'ABC123' })
  .send()
```

### Option 2: Via the builder API

Use `.queue()` instead of `.send()` to explicitly queue any notification:

```ts
// Explicitly queue this notification
await facteur
  .notification(WelcomeNotification)
  .to(user)
  .params({ name: 'John' })
  .queue()
```

This works even if the notification class doesn't have `queue: true` in its options.

## Queue options

You can customize queueing behavior with delay and queue name options.

### Setting options in the notification class

```ts
export class ReminderNotification extends Notification<User> {
  static options: NotificationOptions<User> = {
    name: 'Reminder',
    deliverBy: { email: true },
    // Queue options
    queue: {
      queue: 'high-priority',
      delay: '5m', // Wait 5 minutes before processing
    },
  }

  // ...
}
```

### Setting options via the builder

```ts
await facteur
  .notification(ReminderNotification)
  .to(user)
  .params({})
  .queue({
    queue: 'low-priority',
    delay: '1h', // Wait 1 hour
  })
```

### Merging options

When you use `.queue()` with options on a notification that already has queue options in its class definition, the builder options take precedence but are merged with the class options:

```ts
// Class defines: { queue: 'high-priority', delay: '5m' }
// Builder calls: .queue({ delay: '1h' })
// Result: { queue: 'high-priority', delay: '1h' }
```

## Processing jobs

Jobs are processed by a worker running in a separate process. Set up the worker like this:

```ts
// worker.ts
import { Worker } from '@boringnode/queue'
import { initFacteurWorker, SendNotificationJob } from '@facteurjs/adapter-boring-queue'
import { facteur } from './config/facteur.ts'

// Initialize the Facteur worker context
await initFacteurWorker({ facteur })

// Create and start the @boringnode/queue worker
const worker = new Worker({
  connection: { /* your Redis/database connection */ },
  jobs: {
    'send-notification': SendNotificationJob,
  },
})

await worker.start(['notifications'])
```

The worker discovers all your notification classes via the Facteur discoverer and processes jobs by:
1. Looking up the notification class by its identifier
2. Reconstructing the recipient from the serialized data
3. Building the message for the specific channel
4. Sending via `facteur.sendViaChannel()`

### Worker hooks

You can add hooks to customize worker behavior:

```ts
await initFacteurWorker({
  facteur,

  // Called before sending each job
  beforeSend: async (payload) => {
    console.log(`Processing: ${payload.notificationIdentifier}`)
    // Return false to skip this job
    return true
  },

  // Called after successful send
  afterSend: async (payload) => {
    console.log(`Sent: ${payload.notificationIdentifier} via ${payload.channelName}`)
  },

  // Called on send failure
  onError: async (payload, error) => {
    console.error(`Failed: ${payload.notificationIdentifier}`, error)
  },
})
```

## Job payload structure

Each queued job contains a `NotificationJobPayload` with:

| Field                    | Description                                      |
| ------------------------ | ------------------------------------------------ |
| `notificationIdentifier` | Class name or `options.identifier`               |
| `params`                 | Serialized notification parameters               |
| `recipientData`          | Serialized recipient data                        |
| `channelName`            | Channel to send through (e.g., 'email')          |
| `target`                 | Pre-resolved target (email address, phone, etc.) |
| `tenantId`               | Tenant ID if using multi-tenancy                 |

**Important**: Since the payload is serialized to JSON, make sure your notification params and recipient data are serializable. Don't pass class instances, functions, or circular references.

## Lifecycle hooks

Facteur respects lifecycle hooks when queueing:

- **`shouldSend()`**: Evaluated BEFORE queueing. If it returns false, no job is created.
- **`shouldSendOn(channel)`**: Also evaluated before queueing per channel.

This means you can prevent jobs from being created based on conditions:

```ts
export class ConditionalNotification extends Notification<User, { urgent: boolean }> {
  static options: NotificationOptions<User> = {
    name: 'Conditional',
    queue: true,
    deliverBy: { email: true },
  }

  // If not urgent, don't even queue the job
  override shouldSend() {
    return this.params.urgent
  }

  asEmailMessage() {
    return EmailMessage.create().setBody('Urgent message!')
  }
}
```

## Error handling

When a job fails, @boringnode/queue handles retries based on the job configuration. The default `SendNotificationJob` has `maxRetries: 3`.

For custom error handling, use the `onError` hook in `initFacteurWorker` to log errors, send alerts, or perform cleanup.
