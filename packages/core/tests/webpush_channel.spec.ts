import webpush from 'web-push'
import { setImmediate } from 'node:timers/promises'
import { mock } from 'node:test'
import { test } from '@japa/runner'

import type { WebpushTargets, WebpushSubscription } from '../src/channels/webpush/types.ts'

import { Notification } from '../src/types/notifications.ts'
import { Facteur } from '../src/facteur.ts'
import { errors } from '../src/errors/index.ts'
import { WebpushMessage } from '../src/channels/webpush/message.ts'
import { webpushChannel } from '../src/channels/webpush/channel.ts'

const config = {
  vapidSubject: 'mailto:test@example.com',
  vapidPublicKey: 'test-public-key',
  vapidPrivateKey: 'test-private-key',
  ttl: 0,
  urgency: 'high' as const,
  proxy: 'http://proxy.example.com:8080',
  timeout: 1500,
}
const subscriptions = [
  { endpoint: 'https://push.example.com/phone', keys: { p256dh: 'phone-key', auth: 'phone-auth' } },
  {
    endpoint: 'https://push.example.com/laptop',
    keys: { p256dh: 'laptop-key', auth: 'laptop-auth' },
  },
  {
    endpoint: 'https://push.example.com/tablet',
    keys: { p256dh: 'tablet-key', auth: 'tablet-auth' },
  },
]
const message = WebpushMessage.create().setTitle('Hello').setBody('All your devices')
const responses = [
  { statusCode: 201, headers: { location: '/phone' }, body: 'phone accepted' },
  { statusCode: 202, headers: { location: '/laptop' }, body: 'laptop accepted' },
  { statusCode: 201, headers: { location: '/tablet' }, body: 'tablet accepted' },
]

class DeviceNotification extends Notification {
  static override options = {
    name: 'DeviceNotification',
    tags: [],
    deliverBy: { webpush: true },
  }

  override asWebpushMessage() {
    return message
  }
}

class AnonymousDeviceNotification extends Notification<undefined> {
  override asWebpushMessage() {
    return message
  }
}

test.group('Webpush channel', (group) => {
  group.each.setup(() => {
    mock.method(webpush, 'setVapidDetails', () => {})
  })
  group.each.teardown(() => mock.restoreAll())

  test('preserves single-subscription responses, payload and request options', async ({
    assert,
    expectTypeOf,
  }) => {
    const send = mock.method(webpush, 'sendNotification', async () => responses[0]!)
    const targets: WebpushTargets = { subscription: subscriptions[0]! }

    const result = await webpushChannel(config).send({ message, targets })

    expectTypeOf<WebpushTargets['subscription']>().toEqualTypeOf<webpush.PushSubscription>()
    expectTypeOf(targets.subscription.endpoint).toEqualTypeOf<string>()
    expectTypeOf(result).toEqualTypeOf<webpush.SendResult>()
    expectTypeOf(result.statusCode).toEqualTypeOf<number>()
    assert.deepEqual(result, responses[0])
    assert.equal(send.mock.callCount(), 1)
    assert.deepEqual(send.mock.calls[0]!.arguments, [
      subscriptions[0],
      '{"title":"Hello","body":"All your devices"}',
      { TTL: 0, urgency: 'high', proxy: config.proxy, timeout: 1500 },
    ])
  })

  test('sends to all subscriptions concurrently and returns responses in input order', async ({
    assert,
  }) => {
    const first = Promise.withResolvers<webpush.SendResult>()
    const send = mock.method(
      webpush,
      'sendNotification',
      async (subscription: webpush.PushSubscription) => {
        if (subscription === subscriptions[0]) return first.promise
        return responses[subscriptions.indexOf(subscription)]!
      },
    )

    const pending = webpushChannel(config)
      .send({ message, targets: { subscription: subscriptions } })
      .catch((error) => error)
    try {
      await setImmediate()
      assert.equal(send.mock.callCount(), 3)
      assert.deepEqual(
        send.mock.calls.map((call) => call.arguments),
        subscriptions.map((subscription) => [
          subscription,
          '{"title":"Hello","body":"All your devices"}',
          { TTL: 0, urgency: 'high', proxy: config.proxy, timeout: 1500 },
        ]),
      )
    } finally {
      first.resolve(responses[0]!)
    }

    assert.deepEqual(await pending, responses)
  })

  test('supports one-element and empty subscription arrays', async ({ assert, expectTypeOf }) => {
    const send = mock.method(webpush, 'sendNotification', async () => responses[0]!)
    const channel = webpushChannel(config)
    const targets: WebpushTargets<WebpushSubscription[]> = {
      subscription: [subscriptions[0]!],
    }

    const result = await channel.send({ message, targets })

    expectTypeOf(result).toEqualTypeOf<webpush.SendResult[]>()
    assert.deepEqual(result, [responses[0]])
    assert.deepEqual(await channel.send({ message, targets: { subscription: [] } }), [])
    assert.equal(send.mock.callCount(), 1)
  })

  test('rejects missing targets without contacting the provider', async ({ assert }) => {
    const send = mock.method(webpush, 'sendNotification', async () => responses[0]!)

    await assert.rejects(
      () => webpushChannel(config).send({ message }),
      errors.E_UNAVAILABLE_TARGETS,
    )
    assert.equal(send.mock.callCount(), 0)
  })

  test('waits for healthy devices and reports every failure with provider details', async ({
    assert,
  }) => {
    const expired = new webpush.WebPushError('Gone', 410, {}, 'expired', subscriptions[0]!.endpoint)
    const unavailable = new Error('Connection reset')
    const healthy = Promise.withResolvers<webpush.SendResult>()
    const send = mock.method(
      webpush,
      'sendNotification',
      async (subscription: webpush.PushSubscription) => {
        if (subscription === subscriptions[0]) throw expired
        if (subscription === subscriptions[1]) return healthy.promise
        throw unavailable
      },
    )
    let settled = false
    const pending = webpushChannel(config)
      .send({ message, targets: { subscription: subscriptions } })
      .then(
        () => {
          settled = true
          return undefined
        },
        (error) => {
          settled = true
          return error
        },
      )

    try {
      await setImmediate()
      assert.equal(send.mock.callCount(), 3)
      assert.isFalse(settled)
    } finally {
      healthy.resolve(responses[1]!)
    }

    const error = await pending
    assert.instanceOf(error, AggregateError)
    assert.lengthOf(error.errors, 2)
    assert.equal(error.errors[0].message, 'Webpush subscription is no longer valid: expired')
    assert.strictEqual(error.errors[0].cause, expired)
    assert.strictEqual(error.errors[1], unavailable)
  })

  for (const [statusCode, expectedMessage] of [
    [410, 'Webpush subscription is no longer valid: rejected'],
    [413, 'Webpush payload too large: rejected'],
    [400, 'Invalid webpush request: rejected'],
    [429, 'Webpush rate limit exceeded: rejected'],
  ] as const) {
    test(`preserves single-subscription error handling for HTTP ${statusCode}`, async ({
      assert,
    }) => {
      const failure = new webpush.WebPushError(
        'Rejected',
        statusCode,
        {},
        'rejected',
        subscriptions[0]!.endpoint,
      )
      mock.method(webpush, 'sendNotification', async () => {
        throw failure
      })

      const error = await webpushChannel(config)
        .send({ message, targets: { subscription: subscriptions[0]! } })
        .catch((error) => error)

      assert.instanceOf(error, Error)
      assert.notInstanceOf(error, AggregateError)
      assert.equal(error.message, expectedMessage)
      assert.strictEqual(error.cause, failure)
    })
  }

  test('delivers to all devices of one notifiable through Facteur, including driver batching', async ({
    assert,
  }) => {
    const send = mock.method(webpush, 'sendNotification', async () => responses[0]!)
    const facteur = new Facteur({
      channels: { webpush: webpushChannel(config) },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })
    const user = {
      id: 'user-1',
      notificationTargets: () => ({ webpush: { subscription: subscriptions } }),
    }

    for (const driverBatching of [false, true]) {
      const result = await facteur
        .notification(DeviceNotification)
        .to(user)
        .useDriverBatching(driverBatching)
        .send()

      assert.deepEqual(result, {
        success: 1,
        failed: 0,
        results: [{ channel: 'webpush', status: 'success' }],
      })
    }
    assert.equal(send.mock.callCount(), 6)
    assert.deepEqual(
      send.mock.calls.map((call) => call.arguments[0]),
      [...subscriptions, ...subscriptions],
    )
  })

  test('accepts explicit multiple subscriptions via the fluent API', async ({ assert }) => {
    const send = mock.method(webpush, 'sendNotification', async () => responses[0]!)
    const facteur = new Facteur({
      channels: { webpush: webpushChannel(config) },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const result = await facteur
      .notification(AnonymousDeviceNotification)
      .via({ webpush: { subscription: subscriptions } })
      .send()

    assert.equal(result.success, 1)
    assert.equal(result.failed, 0)
    assert.deepEqual(
      send.mock.calls.map((call) => call.arguments[0]),
      subscriptions,
    )
  })

  test('marks partial delivery as failed instead of reporting full success', async ({ assert }) => {
    const failure = new Error('Connection reset')
    const send = mock.method(
      webpush,
      'sendNotification',
      async (subscription: webpush.PushSubscription) => {
        if (subscription === subscriptions[1]) throw failure
        return responses[0]!
      },
    )
    const facteur = new Facteur({
      channels: { webpush: webpushChannel(config) },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const result = await facteur
      .notification(AnonymousDeviceNotification)
      .via({ webpush: { subscription: subscriptions } })
      .throwOnError(false)
      .send()

    assert.equal(result.success, 0)
    assert.equal(result.failed, 1)
    assert.equal(result.results[0]!.status, 'failed')
    assert.instanceOf(result.results[0]!.error, AggregateError)
    assert.deepEqual(result.results[0]!.error.errors, [failure])
    assert.deepEqual(
      send.mock.calls.map((call) => call.arguments[0]),
      subscriptions,
    )
  })
})
