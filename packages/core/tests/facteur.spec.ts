import { test } from '@japa/runner'

import { FakeNotification, testProvider } from './helpers/index.ts'
import { Notification, type Notifiable } from '../src/types/notifications.ts'
import { errors } from '../src/index.ts'
import { Facteur } from '../src/facteur.ts'

type TestUser = { id: string; email: string } & Notifiable

class UserNotification extends Notification<TestUser, any> {
  static override options = {
    name: 'UserNotification',
    tags: ['test'],
    deliverBy: {
      email: true,
      sms: true,
    },
  }

  asEmailMessage() {
    return {
      subject: 'Test',
      body: 'Test body',
    }
  }
}

test.group('Facteur | send', () => {
  test('throw pretty aggregate error when notification fails', async ({ assert }) => {
    assert.plan(2)

    const provider = testProvider()

    provider.throws()

    const facteur = new Facteur({
      channels: { email: provider, sms: provider },
      discoverer: {
        searchDirectory: new URL('./notifications', import.meta.url),
      },
    })

    try {
      await facteur
        .notification(FakeNotification)
        .via({ email: { to: 'foo@ok.com' }, sms: { to: 'foo@ok.com' } })
        .send()
    } catch (error: any) {
      assert.instanceOf(error, errors.E_SEND_NOTIFICATION_FAILED)
      assert.equal(error.errors.length, 2)
    }
  })

  test('do not throw error when throwOnError is false', async ({ assert }) => {
    const provider = testProvider()

    provider.throws()

    const facteur = new Facteur({
      channels: { email: provider, sms: provider },
      discoverer: {
        searchDirectory: new URL('./notifications', import.meta.url),
      },
    })

    const result = await facteur
      .notification(FakeNotification)
      .via({ email: { to: 'foo@ok.com' }, sms: { to: 'foo@ok.com' } })
      .throwOnError(false)
      .send()

    assert.equal(result.failed, 2)
    assert.equal(result.success, 0)
    assert.equal(result.results.length, 2)
  })

  test('use custom notification resolver', async ({ assert }) => {
    const provider = testProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
      notificationResolver: (notification, ctx) => {
        assert.equal(notification, FakeNotification)
        return new FakeNotification(ctx)
      },
    })

    facteur
      .notification(FakeNotification)
      .via({ email: { to: 'foo@ok.com' } })
      .send()
  })

  test('take shouldSend into account', async ({ assert }) => {
    const provider = testProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    class CustomNotification extends Notification<undefined> {
      static override options: any = {
        name: 'CustomNotification',
        tags: ['test'],
        deliverBy: {
          email: true,
        },
      }

      override shouldSend() {
        return false
      }
    }

    const result = await facteur
      .notification(CustomNotification)
      .via({ email: { to: 'foo@ok.com' } })
      .throwOnError(false)
      .send()

    assert.equal(result.failed, 0)
    assert.equal(result.success, 0)
    assert.equal(result.results.length, 0)
  })

  test('should call prepare method before sending', async ({ assert }) => {
    assert.plan(1)

    const provider = testProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    class CustomNotification extends Notification<undefined> {
      static override options: any = {
        name: 'CustomNotification',
        tags: ['test'],
        deliverBy: {
          email: true,
        },
      }

      override async beforeSend() {
        assert.isTrue(true)
      }
    }

    await facteur
      .notification(CustomNotification)
      .via({ email: { to: 'foo@ok.com' } })
      .throwOnError(false)
      .send()
  })

  test('send to multiple recipients in parallel', async ({ assert }) => {
    const provider = testProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const recipients: TestUser[] = [
      { id: '1', email: 'user1@test.com', notificationTargets: () => ({ email: 'foo1' }) },
      { id: '2', email: 'user2@test.com', notificationTargets: () => ({ email: 'foo2' }) },
      { id: '3', email: 'user3@test.com', notificationTargets: () => ({ email: 'foo3' }) },
    ]

    const result = await facteur.notification(UserNotification).to(recipients).send()

    assert.equal(provider.getSentMessages().length, 3)
    assert.deepEqual(
      provider.getSentMessages().map((msg) => msg.to.email),
      recipients.map((r) => r.email),
    )
    assert.equal(result.success, 3)
    assert.equal(result.failed, 0)
    assert.equal(result.results.length, 3) // 3 channel results (one per recipient)
  })

  test('send to single recipient returns single result', async ({ assert }) => {
    const provider = testProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const result = await facteur
      .notification(UserNotification)
      .to({ id: '1', email: 'user1@test.com', notificationTargets: () => ({ email: 'foo' }) })
      .send()

    assert.equal(result.success, 1)
    assert.equal(result.failed, 0)
    assert.equal(result.results.length, 1)
  })

  test('handle failure with multiple recipients using throwOnError false', async ({ assert }) => {
    const provider = testProvider()
    provider.throws()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const recipients: TestUser[] = [
      {
        id: '1',
        email: 'user1@test.com',
        notificationTargets: () => ({ email: { to: 'user1@test.com' } }),
      },
      {
        id: '2',
        email: 'user2@test.com',
        notificationTargets: () => ({ email: { to: 'user2@test.com' } }),
      },
    ]

    const result = await facteur
      .notification(UserNotification)
      .to(recipients)
      .throwOnError(false)
      .send()

    assert.equal(result.success, 0)
    assert.equal(result.failed, 2)
    assert.equal(result.results.length, 2)
    assert.isTrue(result.results.every((r: any) => r.status === 'failed'))
  })

  test('fake records multiple recipients correctly', async ({ assert }) => {
    const provider = testProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const fake = facteur.fake()

    const recipients: TestUser[] = [
      { id: '1', email: 'user1@test.com', notificationTargets: () => ({ email: 'foo1' }) },
      { id: '2', email: 'user2@test.com', notificationTargets: () => ({ email: 'foo2' }) },
    ]

    await facteur.notification(UserNotification).to(recipients).send()

    const sentNotifications = fake.sent()
    assert.equal(sentNotifications.length, 2)
    assert.equal((sentNotifications[0]!.to as TestUser).id, '1')
    assert.equal((sentNotifications[1]!.to as TestUser).id, '2')
  })

  test('fake records single recipient correctly', async ({ assert }) => {
    const provider = testProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const fake = facteur.fake()

    const user: TestUser = {
      id: '1',
      email: 'user1@test.com',
      notificationTargets: () => ({ email: 'foo1' }),
    }

    await facteur.notification(UserNotification).to(user).send()

    const sentNotifications = fake.sent()
    assert.equal(sentNotifications.length, 1)
    assert.equal((sentNotifications[0]!.to as TestUser).id, '1')

    facteur.restore()
  })

  test('fake records multiple recipients with driver batching', async ({ assert }) => {
    const provider = testProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const fake = facteur.fake()

    const recipients: TestUser[] = [
      { id: '1', email: 'user1@test.com', notificationTargets: () => ({ email: 'foo1' }) },
      { id: '2', email: 'user2@test.com', notificationTargets: () => ({ email: 'foo2' }) },
      { id: '3', email: 'user3@test.com', notificationTargets: () => ({ email: 'foo3' }) },
    ]

    // Even with driver batching enabled, fake mode should intercept and record all recipients
    await facteur.notification(UserNotification).to(recipients).useDriverBatching().send()

    const sentNotifications = fake.sent()
    assert.equal(sentNotifications.length, 3)
    assert.equal((sentNotifications[0]!.to as TestUser).id, '1')
    assert.equal((sentNotifications[1]!.to as TestUser).id, '2')
    assert.equal((sentNotifications[2]!.to as TestUser).id, '3')

    // Provider should not have received any messages (fake mode intercepts)
    assert.equal(provider.getSentMessages().length, 0)

    facteur.restore()
  })

  test('fake records anonymous notification', async ({ assert }) => {
    const provider = testProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const fake = facteur.fake()

    await facteur
      .notification(FakeNotification)
      .via({ email: { to: 'webhook@example.com' } })
      .send()

    const sentNotifications = fake.sent()
    assert.equal(sentNotifications.length, 1)
    assert.isUndefined(sentNotifications[0]!.to)

    facteur.restore()
  })

  test('restore clears fake mode', async ({ assert }) => {
    const provider = testProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const fake = facteur.fake()

    const user: TestUser = {
      id: '1',
      email: 'user1@test.com',
      notificationTargets: () => ({ email: 'foo1' }),
    }

    await facteur.notification(UserNotification).to(user).send()
    assert.equal(fake.sent().length, 1)
    assert.equal(provider.getSentMessages().length, 0)

    facteur.restore()

    // After restore, notifications should be sent for real
    await facteur.notification(UserNotification).to(user).send()
    assert.equal(provider.getSentMessages().length, 1)
  })
})

test.group('Facteur | send typings', (group) => {
  group.tap((t) => t.skip(true, 'Typing only'))

  test('send anonymous notification with via required', async () => {
    const provider = testProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    type User = { id: string; type: 'user'; notificationTargets: any }
    class NoAnonymousNotification extends Notification<User, any> {
      static override options = {
        name: 'NoAnonymousNotification',
        tags: ['test'],
        deliverBy: {
          email: true,
        },
      }
    }

    // With new fluent API, this won't even have .send() available
    // because .to() is required for non-anonymous notifications
    facteur
      .notification(NoAnonymousNotification)
      .to({ id: '1', type: 'user', notificationTargets: {} as any })
      .send()
  })

  test('send anonymous notification with via optional', async () => {
    const facteur = new Facteur({
      channels: { email: testProvider() },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    class AnonymousNotification extends Notification<undefined, any> {
      static override options = {
        name: 'AnonymousNotification',
        tags: ['test'],
        deliverBy: {
          email: true,
        },
      }
    }

    await facteur
      .notification(AnonymousNotification)
      .via({ email: { to: 'foo@ok.com' } })
      .throwOnError(false)
      .send()
  })

  test('fail if notifiable typing mismatch', async () => {
    const provider = testProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    type User = { id: string; type: 'user'; notificationTargets: any }
    class NoAnonymousNotification extends Notification<User, any> {
      static override options = {
        name: 'NoAnonymousNotification',
        tags: ['test'],
        deliverBy: {
          email: true,
        },
      }
    }

    facteur
      .notification(NoAnonymousNotification)
      .to({ id: '1', type: 'user', notificationTargets: {} as any })
      .send()

    facteur
      .notification(NoAnonymousNotification)
      // @ts-expect-error Should throw error because to doesnt match notification typing
      .to({ notificationTargets: {} as any })
      .via({ email: { to: 'foo@ok.com' } })
      .tenant('tenant-id')
      .send()
  })
})
