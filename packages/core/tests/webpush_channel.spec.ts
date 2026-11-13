import { setImmediate } from 'node:timers/promises'
import { mock } from 'node:test'
import { PassThrough, Writable } from 'node:stream'
import https from 'node:https'
import type { IncomingMessage, ClientRequest } from 'node:http'
import { createECDH, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'

import * as webpush from 'web-push'
import { test } from '@japa/runner'

import { Notification } from '../src/types/notifications.ts'
import { Facteur } from '../src/facteur.ts'
import { errors } from '../src/errors/index.ts'
import type { WebpushTargets, WebpushSubscription } from '../src/channels/webpush/types.ts'
import { WebpushMessage } from '../src/channels/webpush/message.ts'
import { webpushChannel } from '../src/channels/webpush/channel.ts'

const vapidKeys = webpush.generateVAPIDKeys()
const receiver = createECDH('prime256v1')
const receiverPublicKey = receiver.generateKeys()
const auth = randomBytes(16)
const config = {
  vapidSubject: 'mailto:test@example.com',
  vapidPublicKey: vapidKeys.publicKey,
  vapidPrivateKey: vapidKeys.privateKey,
  ttl: 0,
  urgency: 'high' as const,
  proxy: 'http://proxy.example.com:8080',
  timeout: 1500,
}
const subscriptions = ['phone', 'laptop', 'tablet'].map((device) => ({
  endpoint: `https://push.example.com/${device}`,
  keys: { p256dh: receiverPublicKey.toString('base64url'), auth: auth.toString('base64url') },
}))
const message = WebpushMessage.create().setTitle('Hello').setBody('All your devices')
const responses = [
  { statusCode: 201, headers: { location: '/phone' }, body: 'phone accepted' },
  { statusCode: 202, headers: { location: '/laptop' }, body: 'laptop accepted' },
  { statusCode: 201, headers: { location: '/tablet' }, body: 'tablet accepted' },
]

class PushTransport {
  requests: { options: https.RequestOptions; body: Buffer }[] = []

  constructor(
    respond: (
      options: https.RequestOptions,
    ) => webpush.SendResult | Error | Promise<webpush.SendResult | Error> = (options) =>
      responses.find((response) => response.headers.location === options.path)!,
  ) {
    mock.method(https, 'request', ((
      options: https.RequestOptions,
      callback: (response: IncomingMessage) => void,
    ) => {
      const chunks: Buffer[] = []
      const request = new Writable({
        autoDestroy: false,
        write(chunk, _encoding, done) {
          chunks.push(Buffer.from(chunk))
          done()
        },
        final: (done) => {
          this.requests.push({ options, body: Buffer.concat(chunks) })
          done()
          void Promise.resolve()
            .then(() => respond(options))
            .then((result) => {
              if (result instanceof Error) {
                request.destroy(result)
                return
              }
              const response = Object.assign(new PassThrough(), {
                statusCode: result.statusCode,
                headers: result.headers,
              })
              // Bridge the deferred provider response to Node's HTTP callback API.
              // eslint-disable-next-line promise/no-callback-in-promise
              callback(response as unknown as IncomingMessage)
              response.end(result.body)
              request.destroy()
            })
            .catch((error) => request.destroy(error))
        },
      })
      return request as unknown as ClientRequest
    }) as typeof https.request)
  }

  get endpoints() {
    return this.requests.map(({ options }) => `https://${options.hostname}${options.path}`)
  }

  decrypt(body: Buffer) {
    // RFC 8291 derives the content key from the subscription secret and the sender's key.
    const salt = body.subarray(0, 16)
    const senderPublicKey = body.subarray(21, 21 + body[20]!)
    const info = Buffer.concat([Buffer.from('WebPush: info\0'), receiverPublicKey, senderPublicKey])
    const secret = hkdfSync('sha256', receiver.computeSecret(senderPublicKey), auth, info, 32)
    const key = hkdfSync('sha256', secret, salt, 'Content-Encoding: aes128gcm\0', 16)
    const nonce = hkdfSync('sha256', secret, salt, 'Content-Encoding: nonce\0', 12)
    const decipher = createDecipheriv('aes-128-gcm', Buffer.from(key), Buffer.from(nonce))
    decipher.setAuthTag(body.subarray(-16))
    const plaintext = Buffer.concat([
      decipher.update(body.subarray(21 + senderPublicKey.length, -16)),
      decipher.final(),
    ])
    // The short test payload occupies one record, terminated by the final-record delimiter.
    if (plaintext.at(-1) !== 2) throw new Error('Invalid final-record delimiter')
    return plaintext.subarray(0, -1).toString()
  }
}

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

test('isolates VAPID and GCM credentials between Webpush channels', async ({ assert, cleanup }) => {
  cleanup(() => mock.restoreAll())
  const transport = new PushTransport(() => ({ statusCode: 201, headers: {}, body: '' }))

  const keysA = webpush.generateVAPIDKeys()
  const keysB = webpush.generateVAPIDKeys()
  const subscription = {
    endpoint: 'https://push.example.com/device',
    keys: { p256dh: keysA.publicKey, auth: Buffer.alloc(16, 1).toString('base64url') },
  }
  const a = webpushChannel({
    vapidSubject: 'mailto:a@example.com',
    vapidPublicKey: keysA.publicKey,
    vapidPrivateKey: keysA.privateKey,
    gcmApiKey: 'gcm-a',
  })

  await a.send({ message, targets: { subscription } })
  assert.include(
    String(Reflect.get(transport.requests.at(-1)!.options.headers!, 'Authorization')),
    `k=${keysA.publicKey}`,
  )

  const b = webpushChannel({
    vapidSubject: 'mailto:b@example.com',
    vapidPublicKey: keysB.publicKey,
    vapidPrivateKey: keysB.privateKey,
    gcmApiKey: 'gcm-b',
  })

  for (const [channel, keys, subject, gcmApiKey] of [
    [a, keysA, 'mailto:a@example.com', 'gcm-a'],
    [b, keysB, 'mailto:b@example.com', 'gcm-b'],
  ] as const) {
    await channel.send({ message, targets: { subscription } })
    const authorization = String(
      Reflect.get(transport.requests.at(-1)!.options.headers!, 'Authorization'),
    )
    assert.include(authorization, `k=${keys.publicKey}`)
    const jwt = authorization.split('t=')[1]!.split(',')[0]!
    const claims = JSON.parse(Buffer.from(jwt.split('.')[1]!, 'base64url').toString())
    assert.equal(claims.sub, subject)

    await channel.send({
      message,
      targets: {
        subscription: {
          ...subscription,
          endpoint: 'https://android.googleapis.com/gcm/send/device',
        },
      },
    })
    assert.equal(
      Reflect.get(transport.requests.at(-1)!.options.headers!, 'Authorization'),
      `key=${gcmApiKey}`,
    )
  }
})

test.group('Webpush channel', (group) => {
  group.each.teardown(() => mock.restoreAll())

  test('preserves single-subscription responses, payload and request options', async ({
    assert,
    expectTypeOf,
  }) => {
    const transport = new PushTransport()
    const targets: WebpushTargets = { subscription: subscriptions[0]! }

    const result = await webpushChannel(config).send({ message, targets })

    expectTypeOf<WebpushTargets['subscription']>().toEqualTypeOf<webpush.PushSubscription>()
    expectTypeOf(targets.subscription.endpoint).toEqualTypeOf<string>()
    expectTypeOf(result).toEqualTypeOf<webpush.SendResult>()
    expectTypeOf(result.statusCode).toEqualTypeOf<number>()
    assert.deepEqual(result, responses[0])
    assert.deepEqual(transport.endpoints, [subscriptions[0]!.endpoint])
    const request = transport.requests[0]!
    assert.equal(request.options.method, 'POST')
    assert.equal(request.options.timeout, 1500)
    assert.deepInclude(request.options.headers, { TTL: 0, Urgency: 'high' })
    assert.deepEqual(Reflect.get(request.options.agent as object, 'proxy'), new URL(config.proxy))
    assert.equal(transport.decrypt(request.body), '{"title":"Hello","body":"All your devices"}')
  })

  test('sends to all subscriptions concurrently and returns responses in input order', async ({
    assert,
  }) => {
    const first = Promise.withResolvers<webpush.SendResult>()
    const transport = new PushTransport((options) => {
      if (options.path === '/phone') return first.promise
      return responses.find((response) => response.headers.location === options.path)!
    })

    const pending = webpushChannel(config)
      .send({ message, targets: { subscription: subscriptions } })
      .catch((error) => error)
    try {
      await setImmediate()
      assert.deepEqual(
        transport.endpoints,
        subscriptions.map(({ endpoint }) => endpoint),
      )
      for (const request of transport.requests) {
        assert.equal(transport.decrypt(request.body), '{"title":"Hello","body":"All your devices"}')
        assert.equal(request.options.timeout, 1500)
        assert.deepInclude(request.options.headers, { TTL: 0, Urgency: 'high' })
        assert.deepEqual(
          Reflect.get(request.options.agent as object, 'proxy'),
          new URL(config.proxy),
        )
      }
    } finally {
      first.resolve(responses[0]!)
    }

    assert.deepEqual(await pending, responses)
  })

  test('supports one-element and empty subscription arrays', async ({ assert, expectTypeOf }) => {
    const transport = new PushTransport()
    const channel = webpushChannel(config)
    const targets: WebpushTargets<WebpushSubscription[]> = {
      subscription: [subscriptions[0]!],
    }

    const result = await channel.send({ message, targets })

    expectTypeOf(result).toEqualTypeOf<webpush.SendResult[]>()
    assert.deepEqual(result, [responses[0]])
    assert.deepEqual(await channel.send({ message, targets: { subscription: [] } }), [])
    assert.lengthOf(transport.requests, 1)
  })

  test('rejects missing targets without contacting the provider', async ({ assert }) => {
    const transport = new PushTransport()

    await assert.rejects(
      () => webpushChannel(config).send({ message }),
      errors.E_UNAVAILABLE_TARGETS,
    )
    assert.lengthOf(transport.requests, 0)
  })

  test('waits for healthy devices and reports every failure with provider details', async ({
    assert,
  }) => {
    const unavailable = new Error('Connection reset')
    const healthy = Promise.withResolvers<webpush.SendResult>()
    const transport = new PushTransport((options) => {
      if (options.path === '/phone')
        return { statusCode: 410, headers: { 'retry-after': '60' }, body: 'expired' }
      if (options.path === '/laptop') return healthy.promise
      return unavailable
    })
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
      assert.lengthOf(transport.requests, 3)
      assert.isFalse(settled)
    } finally {
      healthy.resolve(responses[1]!)
    }

    const error = await pending
    assert.instanceOf(error, AggregateError)
    assert.lengthOf(error.errors, 2)
    assert.equal(error.errors[0].message, 'Webpush subscription is no longer valid: expired')
    assert.instanceOf(error.errors[0].cause, webpush.WebPushError)
    assert.include(error.errors[0].cause, {
      statusCode: 410,
      body: 'expired',
      endpoint: subscriptions[0]!.endpoint,
    })
    assert.deepEqual(error.errors[0].cause.headers, { 'retry-after': '60' })
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
      new PushTransport(() => ({ statusCode, headers: { 'retry-after': '60' }, body: 'rejected' }))

      const error = await webpushChannel(config)
        .send({ message, targets: { subscription: subscriptions[0]! } })
        .catch((error) => error)

      assert.instanceOf(error, Error)
      assert.notInstanceOf(error, AggregateError)
      assert.equal(error.message, expectedMessage)
      assert.instanceOf(error.cause, webpush.WebPushError)
      assert.include(error.cause, {
        statusCode,
        body: 'rejected',
        endpoint: subscriptions[0]!.endpoint,
      })
      assert.deepEqual(error.cause.headers, { 'retry-after': '60' })
    })
  }

  test('delivers to all devices of one notifiable through Facteur, including driver batching', async ({
    assert,
  }) => {
    const transport = new PushTransport()
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
    assert.deepEqual(
      transport.endpoints,
      [...subscriptions, ...subscriptions].map(({ endpoint }) => endpoint),
    )
  })

  test('accepts explicit multiple subscriptions via the fluent API', async ({ assert }) => {
    const transport = new PushTransport()
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
      transport.endpoints,
      subscriptions.map(({ endpoint }) => endpoint),
    )
  })

  test('marks partial delivery as failed instead of reporting full success', async ({ assert }) => {
    const failure = new Error('Connection reset')
    const transport = new PushTransport((options) => {
      if (options.path === '/laptop') return failure
      return responses[0]!
    })
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
      transport.endpoints,
      subscriptions.map(({ endpoint }) => endpoint),
    )
  })
})
