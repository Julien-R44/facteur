import { test } from '@japa/runner'
import { Facteur } from '../src/facteur.js'
import { FakeNotification, testProvider } from './helpers/index.js'
import { errors } from '../src/index.js'
import { Notification } from '../src/types/notifications.js'

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
      notificationResolver: (notification) => {
        assert.equal(notification, FakeNotification)
        return new FakeNotification()
      },
    })

    facteur.send({
      notification: FakeNotification,
      via: { email: { to: 'foo@ok.com' } },
    })
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
      notifiable: { id: '1', type: 'user', notificationTargets: {} as any },
    })

    facteur.send({
      notification: NoAnonymousNotification,
      // @ts-expect-error Should throw error because notifiable doesnt match notification typing
      notifiable: { notificationTargets: {} as any },
      via: { email: { to: 'foo@ok.com' } },
      tenantId: 'tenant-id',
    })
  })
})
