# Multi-tenancy

Facteur supports multi-tenancy out of the box. This is useful for SaaS applications where you need to isolate notifications and preferences per tenant (organization, workspace, team, etc.).

## Use case

Imagine a SaaS application like Slack or Notion where users belong to different organizations. Each user might have different notification preferences per organization:

- In Organization A, a user wants email + Slack notifications
- In Organization B, the same user only wants in-app notifications

Facteur carries a `tenantId` through notification delivery and preference resolution. This context is not an authorization boundary: your application must validate tenant access, and the built-in API has the filtering limitations described below.

## Sending notifications for a tenant

Use the `.tenant()` method when sending a notification:

```ts
await facteur
  .notification(InvoicePaidNotification)
  .params({ amount: 100 })
  .to(user)
  .tenant('org-123') // Scope to this tenant
  .send()
```

The `tenantId` is passed through the entire pipeline. Your notification can access it if needed:

```ts
import { Notification, type NotificationOptions } from '@facteurjs/core/types'
import { TwilioMessage } from '@facteurjs/core/channels/twilio'
import { DatabaseMessage } from '@facteurjs/core/database'
import type { User } from './user.js'

export class InvoicePaidNotification extends Notification<User, { amount: number }> {
  static options: NotificationOptions<User> = {
    name: 'Invoice Paid',
    deliverBy: { twilio: true, database: true },
  }

  asTwilioMessage() {
    return TwilioMessage.create().setBody(
      `Invoice of $${this.params.amount} paid for organization ${this.tenantId}.`,
    )
  }

  asDatabaseMessage() {
    return DatabaseMessage.create().setContent({
      message: `Invoice of $${this.params.amount} paid`,
    })
  }
}
```

## User preferences per tenant

Facteur supports a hierarchical preference system with 4 levels (from most to least specific):

1. **Notification-specific tenant preference** - "Disable email for Invoice Paid in org-123"
2. **Tenant global preference** - "Disable email for all notifications in org-123"
3. **Notification-specific global preference** - "Disable email for Invoice Paid everywhere"
4. **Global preference** - "Disable email for everything"

The resolver orders sources this way, but generated default values can mask lower-priority settings. See [User Preferences](./user-preferences.md#resolution-priority) for the current limitations.

### Example

```text
// User preferences structure in database
{
  global: {
    global: { channels: { email: true, sms: true } },
    notifications: []
  },
  tenants: {
    'org-123': {
      global: { channels: { email: false } },  // Email disabled for this tenant
      notifications: [
        {
          notification: { identifier: 'invoice-paid' },
          channels: { email: true }  // But re-enabled for Invoice Paid
        }
      ]
    }
  }
}
```

With these already-resolved channel values, the priority order for a notification scoped to `org-123` is:

- **Invoice Paid**: Email enabled (notification-specific tenant preference wins)
- **Other notifications**: Email disabled (tenant global preference applies)

## In-app notifications with tenants

When using the `database` channel, notifications are stored with the `tenant_id`:

```sql
SELECT * FROM notifications WHERE notifiable_id = 'user-123' AND tenant_id = 'org-123';
```

Supplying a tenant to list/mark-all operations filters by that tenant. Omitting it does **not** filter to null-tenant notifications: the built-in adapters list or update notifications across the user's tenants. Validate tenant membership in your API authorization. Single-notification `mark-as` updates match the notification ID, owner and exact tenant; omitting `tenantId` matches only notifications without a tenant. See [Server API](./server-api.md#authorization-is-required).

## API and SDK

All API endpoints accept a `tenantId` parameter:

```http
// Backend - using Facteur routes
GET /notifications/notifiable/:notifiableId/notifications?tenantId=org-123
GET /notifications/notifiable/:notifiableId/preferences?tenantId=org-123
POST /notifications/notifiable/:notifiableId/preferences
  { tenantId: 'org-123', preferences: { email: false } }
```

```tsx
// Frontend - using the SDK
import { FacteurProvider, useNotifications } from '@facteurjs/react'

// User identity belongs in the provider; tenant filters belong in calls.
;<FacteurProvider apiUrl={import.meta.env.VITE_API_URL} notifiableId={user.id}>
  <App />
</FacteurProvider>

const { data: notifications } = useNotifications({ tenantId: currentOrganization.id })
// Also pass tenantId to preferences and mark-all calls.
```

## Without a tenant

If you don't use `.tenant()` and neither the database message nor target provides a tenant, new notifications have no tenant. Preference reads without a tenant return global preferences only; notification list/mark-all operations without a tenant cover all of the user's tenant scopes. This is fine for single-tenant applications but is not an isolation boundary for multi-tenant apps.

```ts
// No tenant - works for single-tenant apps
await facteur.notification(WelcomeNotification).to(user).send()
```
