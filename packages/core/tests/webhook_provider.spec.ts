import type { AddressInfo } from 'node:net'
import type { IncomingHttpHeaders, ServerResponse, IncomingMessage } from 'node:http'

import { createServer } from 'node:http'
import { once } from 'node:events'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { test } from '@japa/runner'

import type { WebhookOptions } from '../src/channels/webhook/types.ts'

import { Notification } from '../src/types/notifications.ts'
import { Facteur } from '../src/facteur.ts'
import { errors } from '../src/errors/index.ts'
import {
  E_INVALID_WEBHOOK_SECRET,
  E_WEBHOOK_INSECURE_URL,
} from '../src/channels/webhook/security.ts'
import { webhookChannel } from '../src/channels/webhook/provider.ts'
import { WebhookMessage } from '../src/channels/webhook/message.ts'
import { WebhookRequestException } from '../src/channels/webhook/exceptions.ts'
import { SlackMessage } from '../src/channels/slack/message.ts'
import { slackWebhookChannel } from '../src/channels/slack/channel.ts'
import { DiscordMessage } from '../src/channels/discord/message.ts'
import { discordWebhookChannel } from '../src/channels/discord/channel.ts'

const providers = [
  {
    name: 'webhook',
    createChannel: (options: WebhookOptions<string>) =>
      webhookChannel({ name: 'webhook', ...options }),
    createMessage: () => WebhookMessage.create().setBody({ event: 'order.shipped', orderId: 42 }),
    expectedBody: { event: 'order.shipped', orderId: 42 },
  },
  {
    name: 'slack',
    createChannel: (options: WebhookOptions<string>) => slackWebhookChannel(options),
    createMessage: () => SlackMessage.create().setText('Order 42 shipped'),
    expectedBody: {
      text: 'Order 42 shipped',
      username: '',
      icon_emoji: '',
      icon_url: '',
      channel: '',
      unfurl_links: false,
      unfurl_media: false,
      blocks: [],
    },
  },
  {
    name: 'discord',
    createChannel: (options: WebhookOptions<string>) => discordWebhookChannel(options),
    createMessage: () => DiscordMessage.create().setBody('Order 42 shipped'),
    expectedBody: { tts: false, content: 'Order 42 shipped', embeds: [] },
  },
]

for (const provider of providers) {
  test.group(`Webhook provider | ${provider.name}`, (group) => {
    let baseUrl: string
    let channel: ReturnType<typeof provider.createChannel>
    let message: WebhookMessage
    let requests: Array<{ method: string | undefined; url: string | undefined; body: string }>

    group.each.setup(async () => {
      requests = []
      const server = createServer(async (request, response) => {
        let body = ''
        for await (const chunk of request) body += chunk
        requests.push({ method: request.method, url: request.url, body })
        response.end('ok')
      })
      server.listen(0, '127.0.0.1')
      await once(server, 'listening')
      baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
      channel = provider.createChannel({
        webhooks: {
          enabled: `${baseUrl}/enabled`,
          disabled: `${baseUrl}/disabled`,
          omitted: `${baseUrl}/omitted`,
        },
      })
      message = provider.createMessage()

      return () =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()))
        })
    })

    test('calls only named targets explicitly set to true', async ({ assert }) => {
      await channel.send({ message, targets: { enabled: true, disabled: false } })

      assert.lengthOf(requests, 1)
      assert.equal(requests[0].method, 'POST')
      assert.equal(new URL(requests[0].url!, baseUrl).pathname, '/enabled')
      assert.deepEqual(JSON.parse(requests[0].body), provider.expectedBody)
    })

    test('calls each enabled target in selection order', async ({ assert }) => {
      await channel.send({ message, targets: { omitted: true, enabled: true, disabled: false } })

      assert.deepEqual(
        requests.map((request) => new URL(request.url!, baseUrl).pathname),
        ['/omitted', '/enabled'],
      )
    })

    test('does not call any endpoint for deliberately empty selections', async ({ assert }) => {
      for (const targets of [{}, { enabled: false }, { unknown: false }]) {
        await channel.send({ message, targets })
      }

      assert.deepEqual(requests, [])
    })

    test('rejects missing targets without calling configured endpoints', async ({ assert }) => {
      await assert.rejects(
        () => channel.send({ message }),
        errors.E_UNAVAILABLE_TARGETS,
        `Not able to determine targets for channel "${provider.name}". Provide targets or implement 'notificationTargets()' method.`,
      )

      assert.deepEqual(requests, [])
    })

    test('rejects unknown enabled names before sending to any endpoint', async ({ assert }) => {
      for (const targets of [{ unknown: true }, { enabled: true, unknown: true }]) {
        await assert.rejects(() => channel.send({ message, targets }), errors.E_UNAVAILABLE_TARGETS)
      }

      assert.deepEqual(requests, [])
    })

    test('uses an explicit webhookUrl instead of named endpoints', async ({ assert }) => {
      await channel.send({
        message,
        targets: { webhookUrl: `${baseUrl}/override`, enabled: true },
      })

      assert.lengthOf(requests, 1)
      assert.equal(new URL(requests[0].url!, baseUrl).pathname, '/override')
      assert.deepEqual(JSON.parse(requests[0].body), provider.expectedBody)
    })

    test('supports an explicit URL with no named endpoints configured', async ({ assert }) => {
      const unconfigured = provider.createChannel({ webhooks: {} })
      await unconfigured.send({ message, targets: { webhookUrl: `${baseUrl}/direct` } })

      assert.lengthOf(requests, 1)
      assert.equal(new URL(requests[0].url!, baseUrl).pathname, '/direct')
      assert.deepEqual(JSON.parse(requests[0].body), provider.expectedBody)
    })

    test('supports explicit targets with a single configured webhookUrl', async ({ assert }) => {
      const single = provider.createChannel({ webhookUrl: `${baseUrl}/default` })
      await single.send({ message, targets: { webhookUrl: `${baseUrl}/default` } })
      await single.send({ message, targets: { webhookUrl: `${baseUrl}/override` } })

      assert.deepEqual(
        requests.map((request) => new URL(request.url!, baseUrl).pathname),
        ['/default', '/override'],
      )
    })
  })
}

/**
 * Standard Webhooks verification written independently from the channel code
 */
function verifyStandardWebhook(secret: string, headers: IncomingHttpHeaders, body: string) {
  const id = headers['webhook-id'] as string
  const timestamp = headers['webhook-timestamp'] as string
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest()

  return String(headers['webhook-signature'])
    .split(' ')
    .some((entry) => {
      const [version, signature] = entry.split(',')
      const received = Buffer.from(signature ?? '', 'base64')
      return (
        version === 'v1' &&
        received.length === expected.length &&
        timingSafeEqual(received, expected)
      )
    })
}

const CHANNEL_SECRET = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw'
const TARGET_SECRET = `whsec_${Buffer.from('a-per-organization-secret-32-byte').toString('base64')}`

test.group('Webhook provider | hardening', (group) => {
  let baseUrl: string
  let requests: Array<{ path: string; headers: IncomingHttpHeaders; body: string }>
  let handler: (request: IncomingMessage, response: ServerResponse) => void

  group.each.setup(async () => {
    requests = []
    handler = (_request, response) => response.end('ok')
    const server = createServer(async (request, response) => {
      let body = ''
      for await (const chunk of request) body += chunk
      requests.push({
        path: new URL(request.url!, 'http://x').pathname,
        headers: request.headers,
        body,
      })
      handler(request, response)
    })
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`

    return () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections()
        server.close((error) => (error ? reject(error) : resolve()))
      })
  })

  test('does not sign requests by default', async ({ assert }) => {
    const channel = webhookChannel({ name: 'webhook', webhookUrl: `${baseUrl}/hook` })
    await channel.send({
      message: WebhookMessage.create().setBody({ a: 1 }),
      targets: { webhookUrl: `${baseUrl}/hook` },
    })

    assert.lengthOf(requests, 1)
    assert.notProperty(requests[0].headers, 'webhook-signature')
    assert.notProperty(requests[0].headers, 'webhook-id')
    assert.equal(requests[0].headers['content-type'], 'application/json')
    assert.equal(requests[0].body, '{"a":1}')
  })

  for (const provider of providers) {
    test('{name} signs the exact body sent with the channel secret')
      .with([{ name: provider.name }])
      .run(async ({ assert }) => {
        const channel = provider.createChannel({
          webhookUrl: `${baseUrl}/hook`,
          signingSecret: CHANNEL_SECRET,
        } as WebhookOptions<string>)
        await channel.send({
          message: provider.createMessage(),
          targets: { webhookUrl: `${baseUrl}/hook` },
        })

        const [{ headers, body }] = requests
        assert.deepEqual(JSON.parse(body), provider.expectedBody)
        assert.match(headers['webhook-id'] as string, /^msg_/)
        assert.closeTo(Number(headers['webhook-timestamp']), Date.now() / 1000, 5)
        assert.isTrue(verifyStandardWebhook(CHANNEL_SECRET, headers, body))
      })
  }

  test('signs with the per-target secret instead of the channel secret', async ({ assert }) => {
    const channel = webhookChannel({
      name: 'webhook',
      webhooks: {},
      signingSecret: CHANNEL_SECRET,
    })
    await channel.send({
      message: WebhookMessage.create().setBody({ organization: 'acme', text: 'héllo "q"' }),
      targets: { webhookUrl: `${baseUrl}/acme`, signingSecret: TARGET_SECRET },
    })

    const [{ headers, body }] = requests
    assert.isTrue(verifyStandardWebhook(TARGET_SECRET, headers, body))
    assert.isFalse(verifyStandardWebhook(CHANNEL_SECRET, headers, body))
  })

  test('signs a per-target secret when the channel has none', async ({ assert }) => {
    const channel = webhookChannel({ name: 'webhook', webhooks: {} })
    await channel.send({
      message: WebhookMessage.create().setBody({ a: 1 }),
      targets: { webhookUrl: `${baseUrl}/acme`, signingSecret: TARGET_SECRET },
    })

    assert.isTrue(verifyStandardWebhook(TARGET_SECRET, requests[0].headers, requests[0].body))
  })

  test('keeps webhook-id stable across Facteur retries of the same message', async ({ assert }) => {
    let attempts = 0
    handler = (_request, response) => {
      attempts++
      response.statusCode = attempts === 1 ? 500 : 200
      response.end()
    }

    class OrderShipped extends Notification<undefined, { orderId: number }> {
      static override options = { name: 'OrderShipped', deliverBy: { webhook: true } }
      asWebhookMessage() {
        return WebhookMessage.create().setBody({ orderId: this.params.orderId })
      }
    }

    const facteur = new Facteur({
      channels: {
        webhook: webhookChannel({ name: 'webhook', webhooks: {}, signingSecret: CHANNEL_SECRET }),
      },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
      retry: { retries: 1 },
    })

    const send = (orderId: number) =>
      facteur
        .notification(OrderShipped)
        .params({ orderId })
        .via({ webhook: { webhookUrl: `${baseUrl}/hook` } } as any)
        .send()

    await send(1)
    await send(2)

    assert.lengthOf(requests, 3)
    const [failed, retried, other] = requests
    assert.equal(failed.headers['webhook-id'], retried.headers['webhook-id'])
    assert.notEqual(retried.headers['webhook-id'], other.headers['webhook-id'])
    for (const request of requests) {
      assert.isTrue(verifyStandardWebhook(CHANNEL_SECRET, request.headers, request.body))
    }
  })

  test('uses the message id set with setId()', async ({ assert }) => {
    const channel = webhookChannel({ name: 'webhook', webhooks: {}, signingSecret: CHANNEL_SECRET })
    await channel.send({
      message: WebhookMessage.create().setId('evt_123').setBody({ a: 1 }),
      targets: { webhookUrl: `${baseUrl}/hook` },
    })

    assert.equal(requests[0].headers['webhook-id'], 'evt_123')
    assert.isTrue(verifyStandardWebhook(CHANNEL_SECRET, requests[0].headers, requests[0].body))
  })

  test('rejects invalid secrets before any request', async ({ assert }) => {
    assert.throws(
      () => webhookChannel({ name: 'webhook', webhooks: {}, signingSecret: 'whsec_not base64!' }),
      E_INVALID_WEBHOOK_SECRET as any,
    )

    const channel = webhookChannel({ name: 'webhook', webhooks: {} })
    await assert.rejects(
      () =>
        channel.send({
          message: WebhookMessage.create().setBody({ a: 1 }),
          targets: { webhookUrl: `${baseUrl}/hook`, signingSecret: 'oops-secret' },
        }),
      E_INVALID_WEBHOOK_SECRET as any,
    )
    assert.deepEqual(requests, [])
  })

  test('httpsOnly refuses http URLs before any request', async ({ assert }) => {
    const channel = webhookChannel({
      name: 'webhook',
      httpsOnly: true,
      webhooks: { secure: 'https://example.com/hook', insecure: `${baseUrl}/configured` },
    })

    await assert.rejects(
      () =>
        channel.send({
          message: WebhookMessage.create().setBody({ a: 1 }),
          targets: { webhookUrl: `${baseUrl}/hook` },
        }),
      E_WEBHOOK_INSECURE_URL as any,
    )

    let fetchCalls = 0
    const guarded = webhookChannel({
      name: 'webhook',
      httpsOnly: true,
      fetch: async () => {
        fetchCalls++
        return new Response('ok')
      },
      webhooks: { secure: 'https://example.com/hook', insecure: `${baseUrl}/configured` },
    })
    await assert.rejects(
      () =>
        guarded.send({
          message: WebhookMessage.create().setBody({ a: 1 }),
          targets: { secure: true, insecure: true },
        }),
      E_WEBHOOK_INSECURE_URL as any,
    )

    assert.deepEqual(requests, [])
    assert.equal(fetchCalls, 0)
  })

  test('httpsOnly lets https URLs through', async ({ assert }) => {
    const urls: string[] = []
    const channel = webhookChannel({
      name: 'webhook',
      webhooks: {},
      httpsOnly: true,
      fetch: async (input) => {
        urls.push(input instanceof Request ? input.url : String(input))
        return new Response('ok')
      },
    })

    await channel.send({
      message: WebhookMessage.create().setBody({ a: 1 }),
      targets: { webhookUrl: 'https://hooks.example.com/abc' },
    })

    assert.deepEqual(urls, ['https://hooks.example.com/abc'])
  })

  test('follows redirects by default', async ({ assert }) => {
    handler = (request, response) => {
      if (request.url === '/hook') {
        response.writeHead(302, { location: '/internal' })
      }
      response.end()
    }

    const channel = webhookChannel({ name: 'webhook', webhooks: {} })
    await channel.send({
      message: WebhookMessage.create().setBody({ a: 1 }),
      targets: { webhookUrl: `${baseUrl}/hook` },
    })

    assert.deepEqual(
      requests.map((request) => request.path),
      ['/hook', '/internal'],
    )
  })

  test('followRedirects: false refuses redirects', async ({ assert }) => {
    handler = (request, response) => {
      if (request.url === '/hook') {
        response.writeHead(307, { location: '/internal' })
      }
      response.end()
    }

    const channel = webhookChannel({ name: 'webhook', webhooks: {}, followRedirects: false })
    await assert.rejects(
      () =>
        channel.send({
          message: WebhookMessage.create().setBody({ a: 1 }),
          targets: { webhookUrl: `${baseUrl}/hook` },
        }),
      WebhookRequestException as any,
    )

    assert.deepEqual(
      requests.map((request) => request.path),
      ['/hook'],
    )
  })

  test('sends requests through the custom fetch', async ({ assert }) => {
    const seen: Array<{ url: string; signature: string | null }> = []
    const channel = webhookChannel({
      name: 'webhook',
      webhooks: {},
      signingSecret: CHANNEL_SECRET,
      fetch: async (input, init) => {
        const request = new Request(input, init)
        seen.push({ url: request.url, signature: request.headers.get('webhook-signature') })
        return globalThis.fetch(request)
      },
    })

    await channel.send({
      message: WebhookMessage.create().setBody({ a: 1 }),
      targets: { webhookUrl: `${baseUrl}/hook` },
    })

    assert.lengthOf(seen, 1)
    assert.equal(seen[0].url, `${baseUrl}/hook`)
    assert.equal(seen[0].signature, requests[0].headers['webhook-signature'])
    assert.lengthOf(requests, 1)
  })

  test('aborts requests exceeding the timeout', async ({ assert }) => {
    handler = (_request, response) => {
      setTimeout(() => response.end('late'), 2000).unref()
    }

    const channel = webhookChannel({ name: 'webhook', webhooks: {}, timeout: 100 })
    const startedAt = performance.now()
    await assert.rejects(() =>
      channel.send({
        message: WebhookMessage.create().setBody({ a: 1 }),
        targets: { webhookUrl: `${baseUrl}/hook` },
      }),
    )

    assert.isBelow(performance.now() - startedAt, 1000)
    assert.lengthOf(requests, 1)
  })
})
