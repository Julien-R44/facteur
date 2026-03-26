# @facteurjs/client

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
