# In-App Notifications

To begin with, what are “In‑App notifications”? In Facteur, In‑App notifications are notifications that appear in real time inside your application, typically like notifications on Twitter or Facebook. They’re often shown via a bell icon with a badge indicating the number of unread notifications.

These notifications are stored in your database with several pieces of metadata, such as the read/unread status, the content (entirely arbitrary depending on your application), the user ID of the recipient, and more.

Facteur makes this type of notification straightforward to manage. In this guide, we’ll use Hono, Socket.IO for real‑time notifications, PostgreSQL as the database, and React for the frontend. Note, however, that you can use any framework, any database, and any real‑time transport. Everything in Facteur is decoupled, and it’s easy to write adapters if a given channel or framework isn’t supported yet.

## Configuration setup

The first step is to configure two notification channels: `database` and a real‑time transport channel, such as `transmit` for Server‑Sent Events (SSE).

The `database` channel uses a database adapter such as `knex` or `kysely`, so make sure to use the adapter that matches the database library you already use in your app.

```ts
import { createFacteur } from '@facteurjs/core'
import { databaseChannel } from '@facteurjs/core/database'
import { knexAdapter } from '@facteurjs/core/database/adapters/knex'
import { kyselyAdapter } from '@facteurjs/core/database/adapters/kysely'

export const facteur = createFacteur({
  channels: {
    // Our database channel
    db: databaseChannel({
      adapter: knexAdapter({ connection: knex(...) }),
      // or if you use Kysely
      adapter: kyselyAdapter({ connection: kysely(...) }),
    })

    // And one additional channel for real-time transmission. Transmit in our case
    socketio: socketIoChannel({ server: ioServer }),
  },
})
```

Perfect. We now have storage for notifications and a way to deliver them in real time to our frontend client.

## Database schema

You’ll need to add two new tables to your database: one for notifications and one for user preferences. Here’s a SQL example that you can adapt to your database:

```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  notifiable_id TEXT NOT NULL,
  tenant_id TEXT,
  type TEXT NOT NULL,
  content JSON NOT NULL,
  status TEXT NOT NULL DEFAULT 'unseen',
  tags JSON,
  read_at TIMESTAMP,
  seen_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP,
  INDEX idx_notifiable_id (notifiable_id),
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_status (status),
  INDEX idx_notifiable_tenant (notifiable_id, tenant_id)
);

CREATE TABLE notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT,
  notification_name TEXT,
  channels JSON NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_tenant_id (tenant_id),
  UNIQUE (user_id, tenant_id, notification_name)
);
```

## Typing the data

One particularity of these two channels is that you can transmit and store fully arbitrary data, both in the database and in real time. In the DB case, this data is stored in a JSONB field named `content` as shown above. It’s handy to have some type‑safety and autocomplete around that. Facteur lets you define an interface via module augmentation to type this data.

Back in our `facteur.ts` file, add an interface for the notification data:

```ts
declare module '@facteurjs/core/types' {
  interface DatabaseContent {
    message: string
    description?: string
    severity: 'info' | 'error' | 'success' | 'warning'
    primaryAction?: {
      label: string
      url: string
    }

    secondaryAction?: {
      label: string
      url: string
    }
  }
}
```

With this code, we clearly tell TypeScript that `notification.content` will contain this shape.

## Creating an in‑app notification

Our setup is ready. We can now create a notification and define two messages: one for the database and one for the real‑time transport.

```ts
export default class InvoicePaidNotification extends Notification<User, InvoicePaidParams> {
  static options: NotificationOptions<User> = {
    name: 'Invoice Paid',
    deliverBy: {
      database: true,
      transmit: true,
    },
  }

  asTransmitMessage(): TransmitMessage {
    return TransmitMessage.create().setContent({
      title: 'Invoice Paid',
      body: 'Your invoice has been successfully paid.',
      timestamp: new Date().toISOString(),
    })
  }

  asDatabaseMessage(): DatabaseMessage {
    return DatabaseMessage.create().setContent({
      message: 'Invoice Paid',
      description: `Your invoice of $${this.params.amount} has been successfully paid.`,
    })
  }
}
```

Done! Our notification is ready to be sent.

## API setup

We’ll soon be able to set up the frontend, but one piece is missing: API routes to fetch notifications for the authenticated user.

Facteur provides generic API route handlers; you plug in an adapter for your HTTP framework to actually register them in your app.

Depending on the framework you use, you might need to create a small custom adapter for Facteur (PRs are welcome to add adapters for other frameworks!).

Currently, Hono and AdonisJS are supported. Here’s an example adapter for Hono:

```ts
export class HonoServerAdapter implements ServerAdapter {
  constructor(protected app: Hono) {}

  setRoutes(routes: RouteDefinition[]) {
    for (const route of routes) {
      const method = route.method.toUpperCase()
      const pattern = route.route

      this.app[method.toLowerCase() as 'get' | 'post'](pattern, async (c) => {
        const result = await route.handler({
          body: c.req.json(),
          params: c.req.param(),
          query: c.req.query(),
          headers: c.req.header(),
        })

        return c.json(result.body, result.status as ContentfulStatusCode)
      })
    }
  }
}
```

Let’s assume we’re using Hono here. Install `@facteurjs/hono`, then wire these routes into your app with `createFacteurServer`:

```ts
import { Hono } from 'hono'
import { ioServer } from './socketio.ts'
import { HonoServerAdapter } from '@facteurjs/hono'

const app = new Hono()

/**
 * Registering Facteur routes in Hono using the HonoServerAdapter.
 */
createFacteurServer({ adapter: new HonoServerAdapter(app), facteur })

/**
 * Serve the Hono app and attach the Socket.IO server.
 * SocketIO for real-time notifications.
 */
const server = serve({ fetch: app.fetch, port: 3000 })
ioServer.attach(server)

console.log('Server is running on http://localhost:3000')
console.log('WebSocket server is running on ws://localhost:3000/ws')
```

Great, we now have:
- Our Hono API with preconfigured Facteur routes to manage notifications.
- Our Socket.IO server for real‑time notifications.

Everything’s ready to build the frontend!

## Frontend setup

For the frontend, we’ll use React. If you use another framework, the principle is the same.

We’ll use the `@facteurjs/react` package, which exposes TanStack Query hooks to interact with your own Facteur API. Internally, `@facteurjs/react` uses `@facteurjs/client`, a simple type‑safe SDK to talk to your API. You can use `@facteurjs/client` directly if you’re not using React, don’t want TanStack Query, or for other scenarios.

First, install `@facteurjs/react`:

```sh
pnpm add @facteurjs/react
```

Then add the `FacteurProvider` in your app to configure the Facteur client and provide TanStack Query hooks to your React components:

```tsx
<FacteurProvider
  apiUrl={import.meta.env.VITE_MY_API_URL}
  notifiableId={connectedUser.id}
>
  {/* ... */}
</FacteurProvider>
```

Next, we need to re‑type the notification data so TypeScript can help with autocomplete. Since we’re in a different TypeScript project, we’ll add another module augmentation with the same interface as before:

```ts
declare module '@facteurjs/react' {
  interface DatabaseContent {
    message: string
    description?: string
    severity: 'info' | 'error' | 'success' | 'warning'

    primaryAction?: {
      label: string
      url: string
    }

    secondaryAction?: {
      label: string
      url: string
    }
  }
}
```

All good. Now you can use the TanStack Query hooks exposed by `@facteurjs/react` to interact with your Facteur API. A few examples:

```tsx
import { useNotifications } from '@facteurjs/react'

const { data: notifications, isLoading } = useNotifications()
const { mutate: mark } = useMarkNotification()
const { mutate: markAllAsRead } = useMarkAllNotificationsAsRead()
```

From here, build the UI that displays these notifications, add buttons to mark notifications as read, and so on.

There’s a fairly complete frontend example in the `playgrounds/adonisjs` folder of this repository—feel free to take a look to see how it all fits together. Overall, it’s quite simple.

## Conclusion

That was a high‑level overview of handling In‑App notifications with Facteur. For more details, refer to the documentation specific to each part.
