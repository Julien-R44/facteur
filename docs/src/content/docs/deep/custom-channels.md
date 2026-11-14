# Custom Channels

Facteur comes with many built-in channels (email, SMS, Slack, Discord, etc.), but you can create your own to integrate with any notification service.

## Channel architecture

A channel in Facteur consists of three parts:

1. **Message class** - A builder to construct the message payload
2. **Channel class** - The logic to send messages to the provider
3. **Types** - Configuration options and target types

```
src/channels/acme-sms/
  ├── types.ts      # Config and Targets interfaces
  ├── message.ts    # Message builder class
  ├── channel.ts    # Channel implementation
  └── index.ts      # Exports
```

## Understanding Targets

**Targets** represent the destination address for a channel. Each channel has its own target type depending on how it delivers messages:

| Channel       | Target               | Example                                         |
| ------------- | -------------------- | ----------------------------------------------- |
| Twilio SMS    | Phone number         | `{ to: '+33612345678' }`                        |
| Email         | Email address        | `{ email: 'user@example.com' }`                 |
| Slack webhook | Named webhook or URL | `{ webhookUrl: 'https://hooks.slack.com/...' }` |
| FCM           | Device token         | `{ token: 'fcm_device_token_xxx' }`             |
| Webhook       | URL                  | `{ webhookUrl: 'https://...' }`                 |

Targets can be provided in two ways:

1. **Explicitly** via the `via()` method when sending
2. **Implicitly** via the `notificationTargets()` method on the notifiable (user)

```ts
// Explicit targets
await facteur
  .notification(OrderShippedNotification)
  .to(user)
  .params({ trackingNumber: 'ABC123' })
  .via({ acmeSms: { phoneNumber: '+33612345678' } })
  .send()

// Implicit targets - resolved from the user
await facteur
  .notification(OrderShippedNotification)
  .to(user) // user.notificationTargets() returns { acmeSms: { phoneNumber: '...' } }
  .params({ trackingNumber: 'ABC123' })
  .send()
```

## Creating a channel

Let's build a channel for a fictional SMS provider called "AcmeSMS".

### Step 1: Define types

```ts
// types.ts
export interface AcmeSmsConfig {
  apiKey: string
  defaultSender?: string
}

export interface AcmeSmsTargets {
  phoneNumber: string
}
```

### Step 2: Create the message class

The message class uses a builder pattern for a nice DX:

```ts
// message.ts
export class AcmeSmsMessage {
  #body = ''
  #sender?: string

  static create() {
    return new AcmeSmsMessage()
  }

  setBody(body: string) {
    this.#body = body
    return this
  }

  setSender(sender: string) {
    this.#sender = sender
    return this
  }

  serialize() {
    return {
      body: this.#body,
      sender: this.#sender,
    }
  }
}
```

### Step 3: Implement the channel

```ts
// channel.ts
import { kTargetSymbol, type Channel, type ChannelSendParams } from '@facteurjs/core/types'
import type { AcmeSmsConfig, AcmeSmsTargets } from './types.ts'
import type { AcmeSmsMessage } from './message.ts'

/** Factory function to create an AcmeSMS channel instance. */
export function acmeSmsChannel(config: AcmeSmsConfig) {
  return new AcmeSmsChannel(config)
}

export class AcmeSmsChannel implements Channel<
  AcmeSmsConfig,
  AcmeSmsMessage,
  { messageId: string },
  AcmeSmsTargets
> {
  /**
   * Provider identifier. The configuration key determines the
   * deliverBy key and asAcmeSmsMessage() method name.
   */
  name = 'acmeSms' as const;

  /**
   * Phantom property for TypeScript type inference.
   * Ensures type-safety between the channel and its targets.
   */
  [kTargetSymbol] = null as any as AcmeSmsTargets

  #config: AcmeSmsConfig

  constructor(config: AcmeSmsConfig) {
    this.#config = config
  }

  /**
   * Resolves targets from explicit options or from the notifiable.
   * Throws if no targets can be found.
   */
  #resolveTargets(options: ChannelSendParams<AcmeSmsMessage, AcmeSmsTargets>) {
    if (options.targets) return options.targets

    const notifiableTargets = options.to?.notificationTargets?.()
    if (notifiableTargets?.acmeSms) return notifiableTargets.acmeSms

    throw new Error('No phone number provided for AcmeSMS channel')
  }

  /**
   * Sends a single SMS message via the AcmeSMS API.
   * This method is called by Facteur for each recipient.
   */
  async send(options: ChannelSendParams<AcmeSmsMessage, AcmeSmsTargets>) {
    const message = options.message.serialize()
    const targets = this.#resolveTargets(options)

    const response = await fetch('https://api.acmesms.fake/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.#config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: targets.phoneNumber,
        body: message.body,
        from: message.sender || this.#config.defaultSender,
      }),
    })

    if (!response.ok) throw new Error(`AcmeSMS request failed: ${response.status}`)
    const result = await response.json()
    return { messageId: result.id }
  }
}

// Register the message method on Notification
declare module '@facteurjs/core/types' {
  interface Notification {
    asAcmeSmsMessage(): AcmeSmsMessage
  }
}
```

### Step 4: Export everything

```ts
// index.ts
export { AcmeSmsMessage } from './message.ts'
export { acmeSmsChannel, AcmeSmsChannel } from './channel.ts'
export type { AcmeSmsConfig, AcmeSmsTargets } from './types.ts'
```

## Registering the channel

Add your channel to Facteur and register it with TypeScript:

```ts
// facteur.ts
import { createFacteur } from '@facteurjs/core'
import type { InferChannelsFromConfig } from '@facteurjs/core/types'
import { acmeSmsChannel } from './channels/acme-sms/index.ts'

export const facteur = createFacteur({
  discoverer: { searchDirectory: new URL('./notifications/', import.meta.url) },
  channels: {
    acmeSms: acmeSmsChannel({
      apiKey: process.env.ACME_SMS_API_KEY!,
      defaultSender: '+1234567890',
    }),
  },
})

// This gives you type-safety for channel names
declare module '@facteurjs/core/types' {
  interface NotificationChannels extends InferChannelsFromConfig<typeof facteur> {}
}
```

## Using the channel

Now you can use your channel in notifications:

```ts
import { Notification, type NotificationOptions } from '@facteurjs/core/types'
import { AcmeSmsMessage } from './channels/acme-sms/index.ts'

export class OrderShippedNotification extends Notification<User, { trackingNumber: string }> {
  static options: NotificationOptions = {
    name: 'Order Shipped',
    deliverBy: {
      acmeSms: true,
    },
  }

  asAcmeSmsMessage() {
    return AcmeSmsMessage.create().setBody(
      `Your order has shipped! Tracking: ${this.params.trackingNumber}`,
    )
  }
}
```

## Adding batch support

Some providers support sending multiple messages in a single API call. This is more efficient for bulk notifications.

Add `sendBatch()` and `batchConfig` to your channel:

```ts
import {
  kTargetSymbol,
  type Channel,
  type ChannelSendParams,
  type BatchConfig,
  type BatchSendResult,
} from '@facteurjs/core/types'

export class AcmeSmsChannel implements Channel<
  AcmeSmsConfig,
  AcmeSmsMessage,
  { messageId: string },
  AcmeSmsTargets
> {
  name = 'acmeSms' as const;
  [kTargetSymbol] = null as any as AcmeSmsTargets

  /**
   * Batch configuration. When useDriverBatching() is selected,
   * Facteur groups messages and calls sendBatch().
   */
  batchConfig: BatchConfig = { maxSize: 100, enabled: true }

  #config: AcmeSmsConfig

  constructor(config: AcmeSmsConfig) {
    this.#config = config
  }

  // ... send() and #resolveTargets() methods from before ...

  /**
   * Sends multiple SMS messages in a single API call.
   * More efficient than calling send() multiple times.
   */
  async sendBatch(
    messages: ChannelSendParams<AcmeSmsMessage, AcmeSmsTargets>[],
  ): Promise<BatchSendResult> {
    const payload = messages.map((msg) => {
      const serialized = msg.message.serialize()
      const targets = this.#resolveTargets(msg)

      return {
        to: targets.phoneNumber,
        body: serialized.body,
        from: serialized.sender || this.#config.defaultSender,
      }
    })

    const response = await fetch('https://api.acmesms.fake/batch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.#config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: payload }),
    })

    if (!response.ok) throw new Error(`AcmeSMS batch request failed: ${response.status}`)
    const result = await response.json()

    return {
      success: result.successCount,
      failed: result.failureCount,
      results: result.items.map((item: any, index: number) => ({
        index,
        status: item.success ? 'success' : 'failed',
        error: item.error ? new Error(item.error) : undefined,
        response: item.messageId,
      })),
    }
  }
}
```

Then enable batch mode when sending:

```ts
await facteur
  .notification(OrderShippedNotification)
  .to(users) // Array of users
  .params({ trackingNumber: 'ABC123' })
  .useDriverBatching() // Enable batch sending
  .send()
```

## Notifiable targets

Users can define their notification targets in their model:

```ts
class User implements Notifiable {
  id: string
  phone: string

  notificationTargets() {
    return {
      acmeSms: { phoneNumber: this.phone },
      // Other channels...
    }
  }
}
```

This way you don't need to pass targets explicitly - Facteur resolves them automatically from the recipient.
