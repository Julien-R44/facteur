# @facteurjs/core

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
