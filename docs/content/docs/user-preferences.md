# User Preferences

Facteur includes a built-in preference system that lets users control how they receive notifications. Users can toggle channels on or off at different levels of granularity: globally, per category, or per notification.

When sending a notification, Facteur automatically checks the recipient's preferences and skips channels that have been disabled. You don't need to handle this logic yourself — it's built into the channel resolution pipeline.

## How it works

Preferences are stored in your database as simple rows, each mapping a user to a set of channel toggles. A single preference entry looks like this:

| user_id | tenant_id | notification_name | channels |
|---------|-----------|-------------------|----------|
| user-123 | null | null | `{"email": false, "sms": true}` |
| user-123 | null | invoice-paid | `{"email": true}` |

- When `notification_name` is `NULL`, the preference applies **globally** to all notifications.
- When `notification_name` is set, it applies only to **that specific notification**.

If you already followed the [In-App Notifications](./in-app-notifications.md) guide, you already have the required `notification_preferences` table. If not, here's the schema:

```sql
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

## Resolution priority

When Facteur resolves which channels to use for a notification, preferences are checked in the following order (most specific wins):

1. **Notification-specific tenant preference** — "Disable email for Invoice Paid in org-123"
2. **Tenant global preference** — "Disable email for all notifications in org-123"
3. **Notification-specific global preference** — "Disable email for Invoice Paid everywhere"
4. **Global preference** — "Disable email for everything"
5. **Category preference** — Defaults from your Facteur configuration
6. **`deliverBy`** — The notification's own channel configuration

The first defined preference in this chain wins. If no preference is set at any level, the notification's `deliverBy` configuration is used as the fallback.

Critical notifications (`critical: true` in the notification options) bypass all user preferences entirely.

## Default preferences

You can configure default channel preferences in your Facteur configuration. These act as the baseline before any user preferences are applied.

```ts
const facteur = createFacteur({
  channels: { email: emailChannel(), sms: smsChannel() },
  preferences: {
    global: {
      channels: { email: true, sms: true },
    },
    categories: {
      marketing: { channels: { email: true, sms: false } },
      billing: true, // All channels enabled
    },
  },
})
```

Category preferences use the notification's `category` field:

```ts
export default class InvoicePaidNotification extends Notification<User, InvoicePaidParams> {
  static options = {
    name: 'Invoice Paid',
    identifier: 'invoice-paid',
    category: 'billing',
    deliverBy: { email: true, sms: true },
  }
}
```

## Updating preferences via the API

Facteur's built-in API exposes a POST endpoint to update preferences. The request body accepts a `preferences` object (a flat map of channel names to booleans) and an optional scope.

### Global scope

Omit `notificationName` and `category` to update global preferences for all notifications:

```ts
POST /notifications/notifiable/:notifiableId/preferences
{
  "preferences": { "email": false, "sms": true }
}
```

### Per-notification scope

Pass `notificationName` to update preferences for a specific notification:

```ts
POST /notifications/notifiable/:notifiableId/preferences
{
  "preferences": { "email": false },
  "notificationName": "invoice-paid"
}
```

### Per-category scope

Pass `category` to update preferences for all notifications that belong to a category:

```ts
POST /notifications/notifiable/:notifiableId/preferences
{
  "preferences": { "sms": false },
  "category": "billing"
}
```

This resolves all registered notifications with `category: 'billing'` and updates each one individually.

`notificationName` and `category` are mutually exclusive — providing both returns a `400` error.

### Tenant-scoped updates

Add `tenantId` to scope the update to a specific tenant:

```ts
POST /notifications/notifiable/:notifiableId/preferences
{
  "preferences": { "email": false },
  "notificationName": "invoice-paid",
  "tenantId": "org-123"
}
```

See [Multi-tenancy](./multi-tenancy.md) for more details on tenant-scoped preferences.

## Reading preferences

The GET endpoint returns the full preference structure for a user:

```ts
GET /notifications/notifiable/:notifiableId/preferences?tenantId=org-123
```

The response includes all registered notifications with their current channel preferences, organized by scope:

```ts
{
  global: {
    global: { channels: { email: true, sms: true } },
    notifications: [
      {
        notification: { name: 'Invoice Paid', identifier: 'invoice-paid' },
        channels: { email: true, sms: false }
      },
      // ... all other registered notifications
    ]
  },
  tenants: {
    'org-123': {
      global: { channels: { email: true, sms: true } },
      notifications: [...]
    }
  }
}
```

## Frontend integration

### Using `@facteurjs/client`

```ts
// Fetch preferences
const preferences = await facteur.preferences.list({ tenantId: 'org-123' })

// Update globally (disable email for everything)
await facteur.preferences.update({
  preferences: { email: false },
})

// Update for a specific notification
await facteur.preferences.update({
  preferences: { email: false },
  notificationName: 'invoice-paid',
})

// Update for a category
await facteur.preferences.update({
  preferences: { sms: false },
  category: 'marketing',
})
```

### Using `@facteurjs/react`

```tsx
import { usePreferences, useUpdatePreferences } from '@facteurjs/react'

function NotificationSettings() {
  const { data: preferences, isLoading } = usePreferences()
  const { mutate: updatePreferences } = useUpdatePreferences()

  function handleToggleEmail(enabled: boolean) {
    updatePreferences({
      preferences: { email: enabled },
      notificationName: 'invoice-paid',
    })
  }

  // Build your settings UI using the preferences data
}
```

See the [@facteurjs/client](./sdks/frontend-sdk.md) and [@facteurjs/react](./sdks/react-hooks.md) pages for the full API reference.
