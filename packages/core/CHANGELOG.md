# @facteurjs/core

## 2.0.1

### Patch Changes

- 142f450: Fix published packages: declare the Core runtime dependency on `@poppinss/utils`, include AdonisJS setup stubs at the expected path, and preserve channel types in generated AdonisJS declarations.

## 2.0.0

### Minor Changes

- 65e2de5: Add `Symbol.dispose` support to `FacteurFake` for automatic cleanup with `using`
- 72fa6f5: Add support for Expo Server SDK 4–7, Firebase Admin 14, Twilio 6, Kysely 0.29, Boringnode Transmit 0.4, Adonis Transmit 3, and Adonis Redis 11 while retaining all previously supported optional peer versions.

  No Facteur API migration or SDK upgrade is required. Applications choosing newer SDKs must follow their migration requirements: Expo 5 removes `useFcmV1` and changes `httpAgent` to an Undici `Dispatcher`; Expo 6+ and Kysely 0.29 are ESM-only. Adonis Redis 11 uses ioredis 6, which should not be shared with transports expecting an ioredis 5 client; use separate clients or transport configuration instead.

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

- 3f46e96: Support arrays of Web Push subscriptions to notify all of a user's devices with one Facteur send. Preserve single-subscription behavior and the default `WebpushTargets` typing; explicitly typed arrays can use `WebpushTargets<WebpushSubscription[]>`. Attempt every device before reporting aggregated delivery errors and retain provider error details as the cause.

### Patch Changes

- 666436a: Fix driver batching retries to resend only failed or unconfirmed messages, preserving confirmed successes across partial failures and driver sub-batches.

  Restore `throwOnError` handling and per-notification `afterSend()` hooks and lifecycle events when using `useDriverBatching`.

- 771d2b8: Pass the Expo access token correctly to the SDK as an authentication credential without validating it as a push token or exposing it in a validation error.
- 46ee77d: Fix FCM debugToken setting both token and topic/condition on the message
- e5b0aee: Prevent cross-user and cross-tenant notification status updates by matching the notification ID, notifiable ID, and exact tenant scope in the same database update. An undefined tenant matches only notifications without a tenant; out-of-scope IDs remain unchanged.

  Add optional `tenantId` support to the client `markAsRead` and `markAsSeen` shortcuts and `MarkAsOptions`. Calls without a tenant remain supported for notifications without a tenant.

  Migration required: `updateNotification` callers must now supply `notifiableId` and an explicit `tenantId` alongside `id` and `status`. Pass `tenantId: undefined` for notifications without a tenant. Custom database adapters must enforce the recipient and exact tenant scope atomically, using `tenant_id IS NULL` for an undefined tenant instead of matching all tenants.

- 1d97282: Respect global user channel opt-outs when resolving notification preferences, and isolate global and tenant notification preference objects so tenant changes do not mutate global preferences.
- e9bc0bf: Fix Webhook, Slack, and Discord target selection to send only to named webhooks explicitly enabled with true. Reject unknown enabled names before sending, while preserving empty selections and explicit webhookUrl overrides.
- ad4f20a: Require Node.js >= 24

## 2.0.0-beta.2

### Minor Changes

- 65e2de5: Add `Symbol.dispose` support to `FacteurFake` for automatic cleanup with `using`
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

- 46ee77d: Fix FCM debugToken setting both token and topic/condition on the message

## 2.0.0-beta.1

### Patch Changes

- ad4f20a: Require Node.js >= 24

## 1.0.0-beta.0

### Major Changes

- First version
