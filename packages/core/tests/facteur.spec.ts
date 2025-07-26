import { test } from '@japa/runner'
import { Facteur } from '../src/facteur.js'
import { FakeNotification, testProvider } from './helpers/index.js'
import { errors } from '../src/index.js'

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
})
