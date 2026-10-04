---
'@facteurjs/core': patch
'@facteurjs/client': patch
---

Prevent cross-user and cross-tenant notification status updates by matching the notification ID, notifiable ID, and exact tenant scope in the same database update. An undefined tenant matches only notifications without a tenant; out-of-scope IDs remain unchanged.

Add optional `tenantId` support to the client `markAsRead` and `markAsSeen` shortcuts and `MarkAsOptions`. Calls without a tenant remain supported for notifications without a tenant.

Migration required: `updateNotification` callers must now supply `notifiableId` and an explicit `tenantId` alongside `id` and `status`. Pass `tenantId: undefined` for notifications without a tenant. Custom database adapters must enforce the recipient and exact tenant scope atomically, using `tenant_id IS NULL` for an undefined tenant instead of matching all tenants.
