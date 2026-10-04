# Configuration

`@facteurjs/core` works independently of your HTTP framework. Install the SDK used by each channel alongside Facteur; these provider dependencies are optional peers. For example:

```sh
pnpm add @facteurjs/core twilio web-push
```

## Channels and discovery

```ts
import { createFacteur } from '@facteurjs/core'
import type { InferChannelsFromConfig } from '@facteurjs/core/types'
import { twilioChannel } from '@facteurjs/core/channels/twilio'

export const facteur = createFacteur({
  discoverer: { searchDirectory: new URL('./notifications/', import.meta.url) },
  channels: {
    twilio: twilioChannel({
      accountSid: process.env.TWILIO_ACCOUNT_SID!,
      authToken: process.env.TWILIO_AUTH_TOKEN!,
      from: process.env.TWILIO_FROM!,
    }),
  },
})

declare module '@facteurjs/core/types' {
  interface NotificationChannels extends InferChannelsFromConfig<typeof facteur> {}
}

await facteur.discoverer.discoverNotifications()
```

The keys in `channels` determine the keys in `deliverBy`, `via()` and `notificationTargets()`, as well as the message method name: `twilio` calls `asTwilioMessage()`, `socketIo` calls `asSocketIoMessage()`, and `webpush` calls `asWebpushMessage()`.

Apply the `NotificationChannels` augmentation shown above to every core configuration, including the provider-page examples. Those pages use `MyNotification` as a placeholder; anonymous classes extend `Notification<undefined>` and need explicit `via()` targets. Classes with parameters also need `.params(...)`, while recipient-based classes need `.to(...)`.

Discovery recursively imports default-exported classes extending `Notification` from files ending in `_notification.ts` or `_notification.js`. Set `discoverer.fileSuffix` to change the suffix (without the extension). Class names must be unique. Direct sends can use a class without discovery, but preference reads and category updates require discovery first.

After discovery, `getNotifications()` returns the classes and `getNotificationIdentities()` returns their display names, identifiers, tags and categories. Use `clearCache()` followed by `discoverNotifications()` to rescan.

## Database adapter

The top-level `databaseAdapter` powers `facteur.db` and the [Server API](./server-api.md). Configuring a `database` channel alone only enables storing messages; it does not configure `facteur.db`. Use the same adapter for both, as shown in the [Database channel](./channels/database.md).

The current `createFacteur()` helper fixes the database adapter generic to `null`, so TypeScript can reject a top-level adapter or type `facteur.db` as `never`. Instantiate `new Facteur<typeof channels, typeof adapter>({ channels, databaseAdapter: adapter, discoverer })` instead, as shown in the database guide. `InferChannelsFromConfig<typeof facteur>` has the same limitation for database-backed instances; extend `NotificationChannels` from an alias of `typeof channels` in that case, as shown in that guide.

## Retry configuration

```ts
const retry = {
  retries: 2,
  timeout: '10s' as const,
  channels: {
    twilio: { retries: 4, timeout: '30s' as const },
  },
}
```

Pass `retry` to `createFacteur()`. For single-recipient or anonymous sends, `.retries()` and `.timeout()` override channel settings, which override global settings. Durations accept milliseconds or strings such as `'10s'`. Retries use exponential backoff with jitter; timeouts apply per attempt. Retrying an accepted request can deliver duplicates, so design delivery and hooks accordingly. [Bulk sending](./bulk-sending.md) has different retry semantics.

## Other options

| Option                 | Role                                                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `emitter`              | EventEmitter-compatible object; defaults to Node's `EventEmitter`. See [Events](./deep/events.md).                                              |
| `logger`               | Logger implementing the `@julr/utils/logger` contract; defaults to a no-op logger.                                                              |
| `notificationResolver` | `(NotificationClass, ctx) => new NotificationClass(ctx)` by default; may be async and can instantiate through a dependency-injection container. |
| `preferences`          | Global/category defaults. See [User Preferences](./user-preferences.md) for current resolution limitations.                                     |

## Queues are not implemented in the sending API

The configuration accepts a `queueAdapter` type, but the current notification builder has no `.queue()` or `.delay()` method and `.send()` does not enqueue work. Call `.send()` from your application's own job worker if you need background delivery. Do not configure a queue adapter expecting sends to become asynchronous jobs automatically.

For framework-specific setup, see [AdonisJS](./integrations/adonisjs.md) and [Hono](./integrations/hono.md).
