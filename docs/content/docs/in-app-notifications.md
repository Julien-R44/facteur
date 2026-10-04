# In-App Notifications

In-app notifications combine persistent storage with realtime delivery. This guide uses Hono, Knex/PostgreSQL, Socket.IO and React. You can substitute Kysely, AdonisJS or another HTTP/realtime adapter.

## Configuration

Install the backend dependencies:

```sh
pnpm add @facteurjs/core @facteurjs/hono hono knex pg socket.io
```

Create a Knex connection and Socket.IO server using your application's normal setup, then configure Facteur:

```ts
import { Facteur } from '@facteurjs/core'
import { databaseChannel } from '@facteurjs/core/database'
import { knexAdapter } from '@facteurjs/core/database/adapters/knex'
import { socketIoChannel } from '@facteurjs/core/channels/socketio'
import { connection } from './database.js'
import { ioServer } from './socketio.js'

const adapter = knexAdapter({ connection })
const channels = {
  database: databaseChannel({ adapter }),
  socketIo: socketIoChannel({ server: ioServer }),
}

export const facteur = new Facteur<typeof channels, typeof adapter>({
  channels,
  databaseAdapter: adapter,
  discoverer: { searchDirectory: new URL('./notifications/', import.meta.url) },
})

type AppChannels = typeof channels

declare module '@facteurjs/core/types' {
  interface NotificationChannels extends AppChannels {}
  interface DatabaseContent {
    message: string
    description?: string
    severity: 'info' | 'error' | 'success' | 'warning'
  }
}

await facteur.discoverer.discoverNotifications()
```

The `database` channel stores messages, while the **top-level `databaseAdapter`** enables API reads and preferences. Configure both. Create the tables from the [Database channel schema](./channels/database.md#database-schema) and, if using preferences, [User Preferences](./user-preferences.md#how-it-works).

## Recipient targets

Your recipient provides both storage and realtime targets:

```ts
notificationTargets() {
  return {
    database: { notifiableId: this.id },
    socketIo: { namespace: `/users/${this.id}`, event: 'notification' },
  }
}
```

These are methods on your application's user model. **Socket.IO broadcasts to every client in the chosen namespace.** Authenticate connections and authorize namespace access in your Socket.IO setup. A user-specific namespace name alone does not secure it. The built-in channel does not target rooms; use a custom channel if you need that.

## Notification content

Save this class as `notifications/invoice_paid_notification.ts`:

```ts
import { Notification, type NotificationOptions } from '@facteurjs/core/types'
import { DatabaseMessage } from '@facteurjs/core/database'
import { SocketIoMessage } from '@facteurjs/core/channels/socketio'
import type { User } from '../user.js'

export default class InvoicePaidNotification extends Notification<User, { amount: number }> {
  static options: NotificationOptions<User> = {
    name: 'Invoice Paid',
    identifier: 'invoice-paid',
    deliverBy: { database: true, socketIo: true },
  }

  asDatabaseMessage() {
    return DatabaseMessage.create()
      .setType('invoice-paid')
      .setContent({
        message: 'Invoice Paid',
        description: `Your invoice of $${this.params.amount} has been paid.`,
        severity: 'success',
      })
  }

  asSocketIoMessage() {
    return SocketIoMessage.create().setData({ type: 'invoice-paid' })
  }
}
```

Send it with `facteur.notification(InvoicePaidNotification).to(user).params({ amount: 100 }).send()`. Database and realtime channels send independently; a realtime event is not proof that the database insert has completed. Your frontend should refresh notification data with that ordering in mind.

## API setup

```ts
import { Hono } from 'hono'
import { createHonoFacteurServer } from '@facteurjs/hono'
import { facteur } from './facteur.js'
import { authorizeNotificationRequest } from './authorization.js'

const app = new Hono()

createHonoFacteurServer({
  app,
  facteur,
  authorize: ({ notifiableId, tenantId, ctx }) =>
    authorizeNotificationRequest({ notifiableId, tenantId, ctx }),
})

export default app
```

Implement `authorizeNotificationRequest` in your application to authenticate the caller and verify access to the requested user and tenant. The built-in `mark-as` route then scopes its update by notification ID, owner and exact tenant. Read [Server API](./server-api.md#authorization-is-required) before exposing the API. Serve Hono and attach `ioServer` to your HTTP server separately.

## React frontend

```sh
pnpm add @facteurjs/react @tanstack/react-query
```

Wrap your app in a TanStack `QueryClientProvider`, then configure the client:

```tsx
import { FacteurProvider } from '@facteurjs/react'
;<FacteurProvider
  apiUrl={import.meta.env.VITE_MY_API_URL}
  notifiableId={connectedUser.id}
  credentials="include"
>
  <App />
</FacteurProvider>
```

Use `credentials="include"` for cookie authentication, or provide an authorization header for your token-based API. See [React hooks](./sdks/react-hooks.md) for provider setup and `DatabaseContent` module augmentation in the frontend project.

```tsx
import { useNotifications, useMarkNotification, useMarkAllAsRead } from '@facteurjs/react'

const { data: notifications, isLoading } = useNotifications()
const { mutate: mark } = useMarkNotification()
const { mutate: markAllAsRead } = useMarkAllAsRead()
```

The hooks use HTTP and do not subscribe to Socket.IO automatically. Connect with `socket.io-client` and invalidate/refetch the notification query when you receive a realtime event. The [Socket.IO channel](./channels/socketio.md) describes the transport; [Frontend SDK](./sdks/frontend-sdk.md) covers non-React clients.
