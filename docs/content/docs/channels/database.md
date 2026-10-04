# Database Channel

The Database channel allows you to store notifications directly in your database. This channel is perfect for creating notification centers, audit trails, and persistent notification history that users can access later. It supports Knex and Kysely database adapters.

## Batching

This channel does **not support batching**. Each notification is inserted individually.

## Configuration

```ts
import { Facteur } from '@facteurjs/core'
import { databaseChannel } from '@facteurjs/core/database'
import { knexAdapter } from '@facteurjs/core/database/adapters/knex'
import { connection } from './database.js'

const adapter = knexAdapter({ connection })
const channels = { database: databaseChannel({ adapter }) }

export const facteur = new Facteur<typeof channels, typeof adapter>({
  discoverer: { searchDirectory: new URL('./notifications/', import.meta.url) },
  databaseAdapter: adapter,
  channels,
})

type AppChannels = typeof channels

declare module '@facteurjs/core/types' {
  interface NotificationChannels extends AppChannels {}
}

await facteur.discoverer.discoverNotifications()
```

`connection` is your application's Knex instance. Install `knex` and your SQL driver alongside `@facteurjs/core`. The top-level `databaseAdapter` enables `facteur.db` and the HTTP API; the channel alone only stores messages. For Lucid configuration, use [AdonisJS](../integrations/adonisjs.md).

### Knex adapter

Import `knexAdapter` from `@facteurjs/core/database/adapters/knex`. `connection` accepts a Knex instance or a synchronous function returning one (useful for lazy connections).

### Kysely adapter

Install `kysely` and your SQL driver, then substitute this adapter in the configuration above:

```ts
import { kyselyAdapter } from '@facteurjs/core/database/adapters/kysely'
import { connection } from './kysely.js'

const adapter = kyselyAdapter({ connection })
```

Here `connection` is a Kysely instance, not a callback.

## Configuration Options

- **`adapter`** (required): Database adapter (Knex or Kysely)

### Adapter Options

Both Knex and Kysely adapters support:

- **`connection`** (required): Your database connection instance
- **`tableNames`** (optional): Custom table names for notifications and preferences

## Database Schema

Create the notifications table and optionally the preferences table. This SQL example uses PostgreSQL syntax; adapt identifier, JSON and timestamp types to your database.

### Notifications Table

```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  notifiable_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255),
  type VARCHAR(255) NOT NULL,
  content JSON NOT NULL,
  status VARCHAR(50) DEFAULT 'unread',
  tags JSONB,
  read_at TIMESTAMP,
  seen_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifiable_tenant ON notifications (notifiable_id, tenant_id);
CREATE INDEX idx_status ON notifications (status);
CREATE INDEX idx_created_at ON notifications (created_at);
```

### Notification Preferences Table (Optional)

To use user preferences, create the `notification_preferences` table using the schema in
[User Preferences](../user-preferences.md#how-it-works).

In this table, `user_id` stores the notifiable identifier, `notification_name` is nullable for global
preferences, and `channels` stores a JSON map of channel names to booleans (for example,
`{"email": false, "sms": true}`). Unlike the `notifications` table, the identifier column is named
`user_id`, not `notifiable_id`.

## Targets

The Database channel requires a notifiable identifier:

```ts
await facteur
  .notification(MyNotification)
  .via({
    database: {
      // Notifiable ID (required) - usually a user ID
      notifiableId: '123',

      // Optional: Tenant ID for multi-tenancy
      tenantId: 'tenant-456',
    },
  })
  .send()
```

### Target Properties

- **`notifiableId`** (required): Identifier of the entity receiving the notification (usually user ID)
- **`tenantId`** (optional): Tenant identifier for multi-tenant applications

## Message Features

When creating notifications for the database, you can set various properties:

```ts
import { Notification } from '@facteurjs/core/types'
import { DatabaseMessage } from '@facteurjs/core/database'

export default class DatabaseNotification extends Notification<undefined> {
  asDatabaseMessage() {
    return DatabaseMessage.create()
      .setType('order-shipped')
      .setContent({
        title: 'Order Shipped',
        body: 'Your order #12345 has been shipped',
        orderId: 12345,
        trackingNumber: 'ABC123456',
      })
      .setStatus('unread')
      .setTags(['order', 'shipping'])
      .setNotifiableId('user-123')
      .setTenantId('tenant-456')
  }
}
```

`DatabaseMessage` defaults to `type: 'default'`, `status: 'unread'` and empty tags. It does not automatically copy the notification options' identifier/tags. Message-level notifiable/tenant IDs override targets; a target tenant overrides the builder's `.tenant()` value. Prefer recipient targets and `.tenant()` for ordinary delivery instead of hard-coding user IDs in reusable messages.
