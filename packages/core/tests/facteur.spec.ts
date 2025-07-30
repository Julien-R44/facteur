import { test } from '@japa/runner'
import { Facteur } from '../src/facteur.js'
import { FakeNotification, testProvider } from './helpers/index.js'
import { errors } from '../src/index.js'
import { Notification, type Notifiable } from '../src/types/notifications.js'

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
      await facteur.send({
        notification: FakeNotification,
        via: { email: { to: 'foo@ok.com' }, sms: { to: 'foo@ok.com' } },
      })
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

    const result = await facteur.send({
      notification: FakeNotification,
      via: { email: { to: 'foo@ok.com' }, sms: { to: 'foo@ok.com' } },
      throwOnError: false,
    })

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

    facteur.send({
      notification: FakeNotification,
      via: { email: { to: 'foo@ok.com' } },
    })
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

    const result = await facteur.send({
      notification: CustomNotification,
      via: { email: { to: 'foo@ok.com' } },
      throwOnError: false,
    })

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

    await facteur.send({
      notification: CustomNotification,
      via: { email: { to: 'foo@ok.com' } },
      throwOnError: false,
    })
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

    const result = await facteur.send({
      notification: UserNotification,
      to: recipients,
    })

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

    const result = await facteur.send({
      notification: UserNotification,
      to: { id: '1', email: 'user1@test.com', notificationTargets: () => ({ email: 'foo' }) },
    })

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

    const result = await facteur.send({
      notification: UserNotification,
      to: recipients,
      throwOnError: false,
    })

    assert.equal(result.success, 0)
    assert.equal(result.failed, 2)
    assert.equal(result.results.length, 2)
    assert.isTrue(result.results.every((r) => r.status === 'failed'))
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

    await facteur.send({
      notification: UserNotification,
      to: recipients,
    })

    const sentNotifications = fake.sent()
    assert.equal(sentNotifications.length, 2)
    assert.equal((sentNotifications[0]!.to as TestUser).id, '1')
    assert.equal((sentNotifications[1]!.to as TestUser).id, '2')
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

    // @ts-expect-error Shouldnt be able to send because notifiable is required
    await facteur.send({
      notification: NoAnonymousNotification,
      via: { email: { to: 'foo@ok.com' } },
      throwOnError: false,
    })
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

    await facteur.send({
      notification: AnonymousNotification,
      via: { email: { to: 'foo@ok.com' } },
      throwOnError: false,
    })
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

    facteur.send({
      notification: NoAnonymousNotification,
      to: { id: '1', type: 'user', notificationTargets: {} as any },
    })

    facteur.send({
      notification: NoAnonymousNotification,
      // @ts-expect-error Should throw error because to doesnt match notification typing
      to: { notificationTargets: {} as any },
      via: { email: { to: 'foo@ok.com' } },
      tenantId: 'tenant-id',
    })
  })
})
