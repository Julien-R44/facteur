# Database Channel

The Database channel allows you to store notifications directly in your database. This channel is perfect for creating notification centers, audit trails, and persistent notification history that users can access later.

## Configuration

```ts
import { defineConfig } from 'facteur'
import { databaseChannel, knexAdapter } from '@facteurjs/adonisjs/channels/database'
import { Database } from '@adonisjs/lucid/database'

export default defineConfig({
  channels: {
    database: databaseChannel({
      // Use Knex adapter
      adapter: knexAdapter({
        connection: Database.connection(),
        tableNames: {
          notifications: 'notifications',
          preferences: 'notification_preferences'
        }
      })

      // Or use Kysely adapter
      adapter: kyselyAdapter({
        connection: kyselyInstance,
        tableNames: {
          notifications: 'notifications',
          preferences: 'notification_preferences'
        }
      })
    })
  },
})
```

## Configuration Options

- **`adapter`** (required): Database adapter (Knex or Kysely)

### Adapter Options

Both Knex and Kysely adapters support:

- **`connection`** (required): Your database connection instance
- **`tableNames`** (optional): Custom table names for notifications and preferences

## Database Schema

You need to create the required database tables. Here's the schema:

### Notifications Table

```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  notifiable_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255),
  type VARCHAR(255) NOT NULL,
  content JSON NOT NULL,
  status VARCHAR(50) DEFAULT 'unread',
  tags JSON,
  read_at TIMESTAMP,
  seen_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_notifiable_tenant (notifiable_id, tenant_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

### Notification Preferences Table (Optional)

```sql
CREATE TABLE notification_preferences (
  id SERIAL PRIMARY KEY,
  notifiable_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255),
  channel VARCHAR(255) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY unique_preference (notifiable_id, tenant_id, channel)
);
```

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
      tenantId: 'tenant-456'
    }
  })
  .send()
```

### Target Properties

- **`notifiableId`** (required): Identifier of the entity receiving the notification (usually user ID)
- **`tenantId`** (optional): Tenant identifier for multi-tenant applications

## Message Features

When creating notifications for the database, you can set various properties:

```ts
export default class DatabaseNotification extends Notification {
  asDatabaseMessage() {
    return DatabaseMessage.create()
      .setType('order-shipped')
      .setContent({
        title: 'Order Shipped',
        body: 'Your order #12345 has been shipped',
        orderId: 12345,
        trackingNumber: 'ABC123456'
      })
      .setStatus('unread')
      .setTags(['order', 'shipping'])
      .setNotifiableId('user-123')
      .setTenantId('tenant-456')
  }
}
```
