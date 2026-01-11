# Multi-tenancy

Facteur supports multi-tenancy out of the box. This is useful for SaaS applications where you need to isolate notifications and preferences per tenant (organization, workspace, team, etc.).

## Use case

Imagine a SaaS application like Slack or Notion where users belong to different organizations. Each user might have different notification preferences per organization:

- In Organization A, a user wants email + Slack notifications
- In Organization B, the same user only wants in-app notifications

Facteur handles this by scoping everything (notifications, preferences) to a `tenantId`.

## Sending notifications for a tenant

Use the `.tenant()` method when sending a notification:

```ts
await facteur
  .notification(InvoicePaidNotification)
  .params({ amount: 100 })
  .to(user)
  .tenant('org-123')  // Scope to this tenant
  .send()
```

The `tenantId` is passed through the entire pipeline. Your notification can access it if needed:

```ts
export class InvoicePaidNotification extends Notification<User, { amount: number }> {
  static options = {
    name: 'Invoice Paid',
    deliverBy: { email: true, database: true },
  }

  asEmailMessage({ tenantId, params }) {
    const orgName = getOrgName(tenantId) // Use tenant info if needed

    return EmailMessage.create()
      .setSubject(`Invoice Paid - ${orgName}`)
      .setBody(`Your invoice of $${params.amount} has been paid.`)
  }

  asDatabaseMessage({ params }) {
    return DatabaseMessage.create()
      .setContent({ message: `Invoice of $${params.amount} paid` })
  }
}
```

## User preferences per tenant

Facteur supports a hierarchical preference system with 4 levels (from most to least specific):

1. **Notification-specific tenant preference** - "Disable email for Invoice Paid in org-123"
2. **Tenant global preference** - "Disable email for all notifications in org-123"
3. **Notification-specific global preference** - "Disable email for Invoice Paid everywhere"
4. **Global preference** - "Disable email for everything"

The most specific preference always wins.

### Example

```ts
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

With these preferences, when sending a notification scoped to `org-123`:

- **Invoice Paid**: Email enabled (notification-specific tenant preference wins)
- **Other notifications**: Email disabled (tenant global preference applies)

## In-app notifications with tenants

When using the `database` channel, notifications are stored with the `tenant_id`:

```sql
SELECT * FROM notifications WHERE notifiable_id = 'user-123' AND tenant_id = 'org-123';
```

This ensures users only see notifications relevant to their current tenant/organization.

## API and SDK

All API endpoints accept a `tenantId` parameter:

```ts
// Backend - using Facteur routes
GET /notifications/notifiable/:notifiableId?tenantId=org-123
GET /notifications/notifiable/:notifiableId/preferences?tenantId=org-123
POST /notifications/notifiable/:notifiableId/preferences
  { tenantId: 'org-123', channelPreferences: { email: false } }
```

```ts
// Frontend - using the SDK
import { FacteurProvider, useNotifications } from '@facteurjs/react'

// Set tenantId in the provider
<FacteurProvider
  apiUrl={import.meta.env.VITE_API_URL}
  notifiableId={user.id}
  tenantId={currentOrganization.id}  // Current tenant
>
  <App />
</FacteurProvider>

// Hooks automatically use the tenant context
const { data: notifications } = useNotifications()
```

## Without a tenant

If you don't use `.tenant()`, notifications and preferences are stored/retrieved without tenant scoping. This is fine for single-tenant applications.

```ts
// No tenant - works for single-tenant apps
await facteur
  .notification(WelcomeNotification)
  .to(user)
  .send()
```
