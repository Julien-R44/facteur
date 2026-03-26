# @facteurjs/react

The `@facteurjs/react` package provides React hooks and components to facilitate Facteur integration in React applications. It is built on top of [Tanstack Query](https://tanstack.com/query/latest/docs/react/overview) for query and cache management, and uses `@facteurjs/client` internally.

## Installation

```bash
pnpm install @facteurjs/react @tanstack/react-query
```

Configure the Facteur provider and Tanstack Query in your application:

```tsx
import { FacteurProvider } from '@facteurjs/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FacteurProvider
        apiUrl="https://your-api.com"
        notifiableId={currentUser.id}
      >
        <YourApp />
      </FacteurProvider>
    </QueryClientProvider>
  )
}
```

**FacteurProvider Props:**

- `apiUrl` (string, required): Your Facteur API URL
- `notifiableId` (string|number): Connected user ID
- Plus any [ky options](https://github.com/sindresorhus/ky#options) (`timeout`, `headers`, `hooks`, etc.)

```tsx
<FacteurProvider
  apiUrl="https://your-api.com"
  notifiableId={currentUser.id}
  timeout={5000}
  headers={{ 'Authorization': `Bearer ${token}` }}
>
```

## Type Safety

For better type safety with your custom notification data:

```ts
// types/facteur.ts
declare module '@facteurjs/react' {
  interface DatabaseContent {
    orderId?: number
    productName?: string
    // ... your custom data types
  }
}
```

## React Hooks

## useNotifications()

Hook to retrieve the list of notifications with automatic caching.

**Parameters:**

- `page` (number, optional): Page number
- `limit` (number, optional): Number of items per page
- `status` (string, optional): Filter by status (`'read'` | `'seen'` | `'unread'` | `'unseen'`)
- `tenantId` (string, optional): Tenant ID

```ts
const { data: notifications, isLoading, error } = useNotifications({
  page: 1,
  limit: 10,
  status: 'unread'
})
```

## useMarkAsRead()

Hook to mark a notification as read with automatic cache invalidation.

```ts
const markAsRead = useMarkAsRead()

const handleMarkAsRead = () => {
  markAsRead.mutate({ notificationId: notification.id })
}
```

## useMarkAsSeen()

Hook to mark a notification as seen with automatic cache invalidation.

```ts
const markAsSeen = useMarkAsSeen()

const handleMarkAsSeen = () => {
  markAsSeen.mutate({ notificationId: notification.id })
}
```

## useMarkAllAsRead()

Hook to mark all notifications as read.

```ts
const markAllAsRead = useMarkAllAsRead()

const handleMarkAllAsRead = () => {
  markAllAsRead.mutate({ tenantId: 'optional-tenant-id' })
}
```

## useMarkAllAsSeen()

Hook to mark all notifications as seen.

```ts
const markAllAsSeen = useMarkAllAsSeen()

const handleMarkAllAsSeen = () => {
  markAllAsSeen.mutate({ tenantId: 'optional-tenant-id' })
}
```

## usePreferences()

Hook to retrieve notification preferences with caching.

**Parameters:**

- `tenantId` (string, optional): Tenant ID

```ts
const { data: preferences, isLoading } = usePreferences({
  tenantId: 'tenant-123'
})
```

## useUpdatePreferences()

Hook to update notification preferences. Accepts a flat map of channel booleans, with an optional scope (`notificationName` or `category`).

```ts
const updatePreferences = useUpdatePreferences()

// Disable email for a specific notification
updatePreferences.mutate({
  preferences: { email: false },
  notificationName: 'order-shipped',
})

// Disable SMS for all billing notifications
updatePreferences.mutate({
  preferences: { sms: false },
  category: 'billing',
})

// Disable email globally
updatePreferences.mutate({
  preferences: { email: false },
})
```

## useFacteur()

Hook to directly access the Facteur client (advanced usage).

```ts
const facteur = useFacteur()

const handleCustomAction = async () => {
  // Direct access to client for advanced use cases
  await facteur.notifications.markAs({
    notificationId: 'id',
    status: 'read'
  })
}
```
