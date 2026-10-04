# @facteurjs/client

As seen in the [In-App Notifications](../in-app-notifications.md) guide, Facteur provides a bunch of pre-built routes that you can plug into your own backend. Therefore, Facteur also includes utilities to easily consume these routes from your frontend applications. An SDK to retrieve the list of notifications for a user, mark notifications as read, update preferences, etc. Everything needed to build your UI more easily.

We have a first package `@facteurjs/client` which is framework "agnostic", just pure JavaScript and therefore can be used with any stack. And behind that we have a `@facteurjs/react` package that provides [React hooks](./react-hooks.md) and components to facilitate integration in React applications, with hooks based on Tanstack Query.

## `@facteurjs/client`

The `@facteurjs/client` package provides a simple API to interact with your Facteur backend. It is framework agnostic and can be used in any JavaScript application. The client is built on top of `ky`.

Let's start by installing the `@facteurjs/client` package:

```bash
pnpm install @facteurjs/client
```

Then, you can create a `lib/facteur.ts` file in your project to initialize the Facteur client:

```ts
import { createFacteurClient } from '@facteurjs/client'

const facteur = createFacteurClient({
  // Your API URL
  apiUrl: 'https://your-api.com',

  // Connected user ID, to list only THEIR notifications
  notifiableId: 'user-id',

  // Here you can specify any additional options accepted by ky.
  // See their documentation for more details.
  headers: {
    Authorization: 'Bearer YOUR_ACCESS_TOKEN',
  },
})
```

Also as a reminder, as seen in the [In-App Notifications](../in-app-notifications.md) guide, you can store arbitrary data in your notifications. To help TypeScript understand this, you can pass a generic type to the client:

```ts
import { createFacteurClient } from '@facteurjs/client'
import type { MyNotificationData } from './types'

const facteur = createFacteurClient<MyNotificationData>({
  notifiableId: 'user-id',
  apiUrl: 'https://your-api.com',
})
```

All good! Your client is ready to be used. Here are the available methods

`notifiableId` identifies the user for requests; it does not authenticate them. Configure cookies (`credentials: 'include'`) or headers and enforce authorization on your server. The current `mark-as` route needs an ownership check beyond the URL user; see [Server API](../server-api.md#authorization-is-required).

The client has no default tenant setting. Pass `tenantId` in each list, preferences or mark-all call. Single-notification marking methods currently do not expose `tenantId`; ownership and tenant access must be verified by the server using the notification ID.

### notifications.list()

Retrieves the list of notifications for the user.

**Parameters:**

- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Number of items per page (default: 10, maximum: 100)
- `status` (string, optional): Filter by status (`'read'` | `'seen'` | `'unread'` | `'unseen'`)
- `tenantId` (string, optional): Tenant ID to filter notifications
- `tags` (string[], optional): Filter by tags; the SDK JSON-encodes the array

```ts
const notifications = await facteur.notifications.list({
  page: 1,
  limit: 20,
  status: 'unread',
  tenantId: 'tenant-123',
})
```

Returns an array of notifications, not a pagination object. Timestamp fields are JSON strings. Omitting `tenantId` includes all of the user's tenants with the built-in adapters.

### notifications.markAsRead()

Marks a specific notification as read.

**Parameters:**

- `notificationId` (string, required): ID of the notification to mark

```ts
await facteur.notifications.markAsRead({
  notificationId: 'notification-id',
})
```

### notifications.markAsSeen()

Marks a specific notification as seen.

**Parameters:**

- `notificationId` (string, required): ID of the notification to mark

```ts
await facteur.notifications.markAsSeen({
  notificationId: 'notification-id',
})
```

### notifications.markAllAsRead()

Marks all notifications as read.

**Parameters:**

- `tenantId` (string, optional): Tenant ID to filter notifications

```ts
await facteur.notifications.markAllAsRead({
  tenantId: 'tenant-123',
})
```

### notifications.markAllAsSeen()

Marks all notifications as seen.

**Parameters:**

- `tenantId` (string, optional): Tenant ID to filter notifications

```ts
await facteur.notifications.markAllAsSeen({
  tenantId: 'tenant-123',
})
```

### notifications.markAs()

Marks a notification with a specific status (generic method).

**Parameters:**

- `notificationId` (string, required): ID of the notification to mark
- `status` (string, required): Status to apply (`'read'` | `'seen'`)

```ts
await facteur.notifications.markAs({
  notificationId: 'notification-id',
  status: 'read',
})
```

### notifications.markAllAs()

Marks all notifications with a specific status (generic method).

**Parameters:**

- `status` (string, required): Status to apply (`'read'` | `'seen'`)
- `tenantId` (string, optional): Tenant ID to filter notifications

```ts
await facteur.notifications.markAllAs({
  status: 'seen',
  tenantId: 'tenant-123',
})
```

### preferences.list()

Retrieves the user's notification preferences.

**Parameters:**

- `tenantId` (string, optional): Tenant ID to retrieve specific preferences

```ts
const preferences = await facteur.preferences.list({
  tenantId: 'tenant-123',
})
```

### preferences.update()

Updates the user's notification preferences. The `preferences` object is a flat map of channel names to booleans. You can scope the update to a specific notification, a category, or apply it globally.

**Parameters:**

- `preferences` (object, required): Channel preferences as `{ channelName: boolean }`
- `tenantId` (string, optional): Tenant ID to scope the update
- `notificationName` (string, optional): Update preferences for a specific notification
- `category` (string, optional): Update preferences for all notifications in a category

`notificationName` and `category` are mutually exclusive.

Use the stable notification identifier for `notificationName`. Updates replace the stored channel map for the scope, so include existing toggles that should be retained. Category updates apply only to currently discovered notification classes.

```ts
// Disable email for a specific notification
await facteur.preferences.update({
  preferences: { email: false },
  notificationName: 'order-shipped',
})

// Disable SMS for all billing notifications
await facteur.preferences.update({
  preferences: { sms: false },
  category: 'billing',
})

// Disable email globally
await facteur.preferences.update({
  preferences: { email: false },
})
```
