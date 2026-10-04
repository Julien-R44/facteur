import type { AddressInfo } from 'node:net'

import { createServer } from 'node:http'
import { once } from 'node:events'
import { test } from '@japa/runner'

import type { WebhookOptions } from '../src/channels/webhook/types.ts'

import { errors } from '../src/errors/index.ts'
import { webhookChannel } from '../src/channels/webhook/provider.ts'
import { WebhookMessage } from '../src/channels/webhook/message.ts'
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
