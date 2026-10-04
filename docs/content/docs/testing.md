# Testing

Facteur provides a fake to capture send requests without contacting providers. This verifies that application code requested a notification, not that channel formatting, preferences or provider delivery are correct.

## Fake notifications

After `fake()`, recipient sends record one notification per recipient. They skip the configured notification resolver, lifecycle hooks and channel/preference resolution. Anonymous sends still run preparation and `shouldSend()` before recording. Test lifecycle and routing separately using controlled channel/database adapters when those behaviors matter.

```typescript
import { test } from '@japa/runner'
import { facteur } from '#services/facteur'
import { WelcomeNotification } from '#notifications/welcome'

test('sends welcome notification to new users', async () => {
  using fake = facteur.fake()

  await facteur.notification(WelcomeNotification).to(user).send()

  fake.assertSentCount(1)
})
```

The `using` keyword automatically calls `facteur.restore()` when the variable goes out of scope, even if the test throws an error. You can also manually manage the lifecycle if you prefer:

```typescript
const fake = facteur.fake()

// ... your test ...

facteur.restore()
```

## Assertions

The fake instance provides the following assertion methods.

### assertSentCount

Assert the total number of notifications sent.

```typescript
fake.assertSentCount(2)
```

You can also pass a notification class to assert the count for a specific notification type.

```typescript
fake.assertSentCount(WelcomeNotification, 1)
```

### assertNoneSent

Assert that no notifications were sent.

```typescript
fake.assertNoneSent()
```

### assertSent

Assert that a specific notification was sent. You can optionally pass a callback to perform additional assertions on the captured notification.

```typescript
import assert from 'node:assert'

fake.assertSent(WelcomeNotification, (sent) => {
  assert.equal(sent.to.email, 'user@example.com')
})
```

## Accessing captured notifications

You can access the captured notifications using the `sent` method.

```typescript
const all = fake.sent()
const welcomeOnly = fake.sent(WelcomeNotification)
```

Each captured notification contains:

- `notification` - The notification instance
- `to` - The recipient (notifiable)
- `params` - The parameters passed to the notification
- `via` - The channels used to send the notification

## Clearing captured notifications

If you need to reset the captured notifications within the same test, use the `clear` method.

```typescript
fake.clear()
```

Note that calling `facteur.fake()` creates a fresh instance, so you don't need to call `clear()` between tests if you call `fake()` at the beginning of each test.
