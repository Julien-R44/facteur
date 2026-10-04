# @facteurjs/client

## 2.0.0

### Minor Changes

- 5da38e9: Support global and per-category preference updates

  The preferences API now supports three mutually exclusive scopes:

  ```ts
  // Global — disable email for everything
  await client.preferences.update({ preferences: { email: false } });

  // Per-notification
  await client.preferences.update({
    preferences: { email: false },
    notificationName: "invoice-paid",
  });

  // Per-category — disable SMS for all billing notifications
  await client.preferences.update({
    preferences: { sms: false },
    category: "billing",
  });
  ```

  Also fixes `notificationName` handling in database adapters for NULL values and corrects identifier resolution priority in the notification discoverer.

### Patch Changes

- e5b0aee: Prevent cross-user and cross-tenant notification status updates by matching the notification ID, notifiable ID, and exact tenant scope in the same database update. An undefined tenant matches only notifications without a tenant; out-of-scope IDs remain unchanged.

  Add optional `tenantId` support to the client `markAsRead` and `markAsSeen` shortcuts and `MarkAsOptions`. Calls without a tenant remain supported for notifications without a tenant.

  Migration required: `updateNotification` callers must now supply `notifiableId` and an explicit `tenantId` alongside `id` and `status`. Pass `tenantId: undefined` for notifications without a tenant. Custom database adapters must enforce the recipient and exact tenant scope atomically, using `tenant_id IS NULL` for an undefined tenant instead of matching all tenants.

- ad4f20a: Require Node.js >= 24

## 2.0.0-beta.2

### Minor Changes

- 5da38e9: Support global and per-category preference updates

  The preferences API now supports three mutually exclusive scopes:

  ```ts
  // Global — disable email for everything
  await client.preferences.update({ preferences: { email: false } });

  // Per-notification
  await client.preferences.update({
    preferences: { email: false },
    notificationName: "invoice-paid",
  });

  // Per-category — disable SMS for all billing notifications
  await client.preferences.update({
    preferences: { sms: false },
    category: "billing",
  });
  ```

  Also fixes `notificationName` handling in database adapters for NULL values and corrects identifier resolution priority in the notification discoverer.

## 2.0.0-beta.1

### Patch Changes

- ad4f20a: Require Node.js >= 24

## 1.0.0-beta.0

### Major Changes

- First version
