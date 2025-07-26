import { test } from '@japa/runner'
import EventEmitter from 'node:events'
import { pEvent } from 'p-event'

import { Facteur } from '../src/index.js'
import { FakeNotification, testProvider } from './helpers/index.js'

test.group('Facteur | Events', () => {
  test('emit message sending event when message starts sending', async ({ assert }) => {
    const emitter = new EventEmitter()
    const provider = testProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
      emitter,
    })

    facteur.send({
      notification: FakeNotification,
      via: { email: { to: 'foo@ok.com' } },
    })

    const event = await pEvent(emitter, 'facteur:message:sending')

    assert.equal(event.channelName, 'email')
    assert.instanceOf(event.notification, FakeNotification)
    assert.isDefined(event.message)
    assert.isDefined(event.sendOptions)
  })

  test('emit message sent event when message is successfully sent', async ({ assert }) => {
    const emitter = new EventEmitter()
    const provider = testProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: {
        searchDirectory: new URL('./notifications', import.meta.url),
      },
      emitter,
    })

    facteur.send({
      notification: FakeNotification,
      via: { email: { to: 'foo@ok.com' } },
    })

    const event = await pEvent(emitter, 'facteur:message:sent')

    assert.equal(event.channelName, 'email')
    assert.instanceOf(event.notification, FakeNotification)
    assert.isDefined(event.message)
    assert.isDefined(event.sendOptions)
  })

  test('emit message failed event when message fails to send', async ({ assert }) => {
    const emitter = new EventEmitter()
    const provider = testProvider()

    provider.throws()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: {
        searchDirectory: new URL('./notifications', import.meta.url),
      },
      emitter,
    })

    facteur.send({
      notification: FakeNotification,
      via: { email: { to: 'foo@ok.com' } },
      throwOnError: false,
    })

    const event = await pEvent(emitter, 'facteur:message:failed')

    assert.equal(event.channelName, 'email')
    assert.instanceOf(event.notification, FakeNotification)
    assert.isDefined(event.message)
    assert.isDefined(event.sendOptions)
    assert.instanceOf(event.error, Error)
  })

  test('emit notification sending event when notification starts sending', async ({ assert }) => {
    const emitter = new EventEmitter()
    const provider = testProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: {
        searchDirectory: new URL('./notifications', import.meta.url),
      },
      emitter,
    })

    facteur.send({
      notification: FakeNotification,
      via: { email: { to: 'foo@ok.com' } },
      params: { test: 'value' },
    })

    const event = await pEvent(emitter, 'facteur:notification:sending')

    assert.instanceOf(event.notification, FakeNotification)
    assert.equal(event.sendOptions.params.test, 'value')
    assert.isDefined(event.resolvedChannels)
  })

  test('emit notification sent event when notification is successfully sent', async ({
    assert,
  }) => {
    const emitter = new EventEmitter()
    const provider = testProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: {
        searchDirectory: new URL('./notifications', import.meta.url),
      },
      emitter,
    })

    facteur.send({
      notification: FakeNotification,
      via: { email: { to: 'foo@ok.com' } },
      params: { test: 'value' },
    })

    const event = await pEvent(emitter, 'facteur:notification:sent')

    assert.instanceOf(event.notification, FakeNotification)
    assert.equal(event.sendOptions.params.test, 'value')
    assert.isArray(event.results)
    assert.equal(event.results.length, 1)
    assert.equal(event.results[0].status, 'success')
  })

  test('emit notification failed event when notification fails to send', async ({ assert }) => {
    const emitter = new EventEmitter()
    const provider = testProvider()

    provider.throws()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: {
        searchDirectory: new URL('./notifications', import.meta.url),
      },
      emitter,
    })

    facteur.send({
      notification: FakeNotification,
      via: { email: { to: 'foo@ok.com' } },
      throwOnError: false,
    })

    const event = await pEvent(emitter, 'facteur:notification:failed')

    assert.instanceOf(event.notification, FakeNotification)
    assert.isDefined(event.sendOptions)
    assert.isArray(event.errors)
    assert.equal(event.errors.length, 1)
    assert.instanceOf(event.errors[0], Error)
  })

  test('emit events in correct order for successful notification', async ({ assert }) => {
    const emitter = new EventEmitter()
    const provider = testProvider()
    const events: string[] = []

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: {
        searchDirectory: new URL('./notifications', import.meta.url),
      },
      emitter,
    })

    // Listen to all events to track order
    emitter.on('facteur:notification:sending', () => events.push('notification:sending'))
    emitter.on('facteur:message:sending', () => events.push('message:sending'))
    emitter.on('facteur:message:sent', () => events.push('message:sent'))
    emitter.on('facteur:notification:sent', () => events.push('notification:sent'))

    await facteur.send({
      notification: FakeNotification,
      via: { email: { to: 'foo@ok.com' } },
    })

    assert.deepEqual(events, [
      'notification:sending',
      'message:sending',
      'message:sent',
      'notification:sent',
    ])
  })

  test('emit events in correct order for failed notification', async ({ assert }) => {
    const emitter = new EventEmitter()
    const provider = testProvider()
    const events: string[] = []

    provider.throws()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: {
        searchDirectory: new URL('./notifications', import.meta.url),
      },
      emitter,
    })

    // Listen to all events to track order
    emitter.on('facteur:notification:sending', () => events.push('notification:sending'))
    emitter.on('facteur:message:sending', () => events.push('message:sending'))
    emitter.on('facteur:message:failed', () => events.push('message:failed'))
    emitter.on('facteur:notification:failed', () => events.push('notification:failed'))

    await facteur.send({
      notification: FakeNotification,
      via: { email: { to: 'foo@ok.com' } },
      throwOnError: false,
    })

    assert.deepEqual(events, [
      'notification:sending',
      'message:sending',
      'message:failed',
      'notification:failed',
    ])
  })
})
