# FacteurJS

Facteur is a framework-agnostic notification library for Node.js. Define one notification class, format messages for each channel, and send to a recipient or a list of recipients.

Current channels include database storage (Knex/Kysely), AdonisJS Mail, Twilio SMS, AWS SNS SMS, Web Push, Firebase Cloud Messaging, Expo, Slack/Discord webhooks, Socket.IO and Transmit (SSE). WhatsApp is planned, not implemented.

::include{template="partials/supported_providers"}

## Sending notifications

After [configuring Facteur](./quick-start.md), define a notification:

```ts
import { Notification } from '@facteurjs/core/types'
import { SlackMessage } from '@facteurjs/core/channels/slack'

export default class UserRegisteredNotification extends Notification<User> {
  static options = {
    name: 'User Registered',
    category: 'business',
    deliverBy: { slack: true },
  }

  asSlackMessage() {
    return SlackMessage.create().setText(`A new user registered: ${this.notifiable.name}`)
  }
}
```

`User` is your application's recipient model. It provides `notificationTargets()` with a Slack webhook destination (see [Slack](./channels/slack.md)).

```ts
await facteur.notification(UserRegisteredNotification).to(user).send()
```

Use the fluent builder for explicit targets, parameters, tenants, retries and [bulk sending](./bulk-sending.md). FCM and Expo support native batches when you opt in with `.useDriverBatching()`.

## In-app notifications

Combine database storage with a realtime channel to build a notification center. Store arbitrary JSON with `DatabaseMessage.create().setContent(...)`; send realtime data with `SocketIoMessage.create().setData(...)` or `TransmitMessage.create().setContent(...)`.

Facteur provides a [Server API](./server-api.md) to list notifications, mark them read/seen and manage preferences. Register it through Hono, AdonisJS, or a custom HTTP adapter. Authorization is required, and the current `mark-as` route additionally needs an application-level ownership check.

Follow [In-App Notifications](./in-app-notifications.md) for a complete setup.

## Preferences and tenants

Database-backed [User Preferences](./user-preferences.md) expose global, per-notification and tenant-specific channel settings. Category updates apply to the currently discovered classes in that category. Critical notifications bypass preferences; explicit `via()` also bypasses them. See that guide for current resolution limitations.

Use `.tenant(id)` to attach tenant context to a send. [Multi-tenancy](./multi-tenancy.md) explains storage, API filtering and tenant-access requirements.

## Frontend SDK and React hooks

The framework-independent client lives in `@facteurjs/client`:

```ts
import { createFacteurClient } from '@facteurjs/client'

const client = createFacteurClient({
  apiUrl: 'https://api.example.com',
  notifiableId: '123',
  credentials: 'include',
})

const notifications = await client.notifications.list({ tenantId: '456' })
await client.notifications.markAsRead({ notificationId: '789' })
await client.preferences.update({ preferences: { slack: false } })
```

`@facteurjs/react` provides TanStack Query hooks inside `FacteurProvider` and `QueryClientProvider`:

```tsx
import { useNotifications, useMarkAsRead } from '@facteurjs/react'

const { data, isLoading } = useNotifications({ tenantId: '456' })
const { mutate: markAsRead } = useMarkAsRead()
```

See [Frontend SDK](./sdks/frontend-sdk.md) and [React hooks](./sdks/react-hooks.md). The hooks use HTTP; realtime subscriptions remain application code.

## Extending Facteur

Create [custom channels](./deep/custom-channels.md) and [HTTP adapters](./deep/custom-http-adapter.md) for services or frameworks not built in. Database adapters currently support Knex and Kysely; Prisma is not bundled.

Queues, delayed delivery, debouncing, topics and headless UI components are not implemented in the current sending API. Native FCM/Expo batching and retries are already available.

## Sponsor

If you find Facteur useful, [consider sponsoring the project](https://github.com/sponsors/Julien-R44/).
