import type { AddressInfo } from 'node:net'
import { createServer } from 'node:http'
import { once } from 'node:events'

import { test } from '@japa/runner'

import { SlackMessage } from '../src/channels/slack/message.ts'
import { slackWebhookChannel } from '../src/channels/slack/channel.ts'
import { DiscordMessage } from '../src/channels/discord/message.ts'
import { discordWebhookChannel } from '../src/channels/discord/channel.ts'

test.group('Chat messages', (group) => {
  let webhookUrl: string
  let requests: Array<{ url: URL; body: any }>

  group.each.setup(async () => {
    requests = []
    const server = createServer(async (request, response) => {
      let body = ''
      for await (const chunk of request) body += chunk
      requests.push({ url: new URL(request.url!, 'http://localhost'), body: JSON.parse(body) })
      response.end('{}')
    })
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    webhookUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/hook`

    return () => new Promise<void>((resolve) => server.close(() => resolve()))
  })

  test('sends a Slack attachment with its color and blocks, after the blocks of the message', async ({
    assert,
  }) => {
    const message = SlackMessage.create()
      .setText('Deployment of worker failed')
      .addHeaderBlock('Release 42')
      .addAttachment((attachment) =>
        attachment
          .setColor('#e01e5a')
          .setFallback('Deployment of worker failed')
          .addSectionBlock((block) => block.addMarkdownField('*Project*\nShop'))
          .addActionsBlock((block) =>
            block.addButton({ text: 'Open worker', actionId: 'open', url: 'https://example.com' }),
          ),
      )

    await slackWebhookChannel({ webhooks: {} }).send({ message, targets: { webhookUrl } })

    assert.deepEqual(requests[0].body.blocks, [
      { type: 'header', text: { type: 'plain_text', text: 'Release 42' } },
    ])
    assert.deepEqual(requests[0].body.attachments, [
      {
        color: '#e01e5a',
        fallback: 'Deployment of worker failed',
        blocks: [
          { type: 'section', fields: [{ type: 'mrkdwn', text: '*Project*\nShop' }] },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Open worker' },
                action_id: 'open',
                url: 'https://example.com',
              },
            ],
          },
        ],
      },
    ])
  })

  test('sends Discord link buttons in rows of 5, with the query parameter that lets a webhook send them', async ({
    assert,
  }) => {
    const message = DiscordMessage.create().addEmbed((embed) =>
      embed.setTitle('api deployed').setColor('#2eb67d'),
    )
    for (let index = 1; index <= 6; index++) {
      message.addLinkButton({ label: `Link ${index}`, url: `https://example.com/${index}` })
    }

    await discordWebhookChannel({ webhooks: {} }).send({ message, targets: { webhookUrl } })

    assert.equal(requests[0].url.searchParams.get('wait'), 'true')
    assert.equal(requests[0].url.searchParams.get('with_components'), 'true')
    assert.deepEqual(
      requests[0].body.components.map((row: { type: number; components: { label: string }[] }) => ({
        type: row.type,
        labels: row.components.map((button) => button.label),
      })),
      [
        { type: 1, labels: ['Link 1', 'Link 2', 'Link 3', 'Link 4', 'Link 5'] },
        { type: 1, labels: ['Link 6'] },
      ],
    )
    assert.deepEqual(requests[0].body.components[0].components[0], {
      type: 2,
      style: 5,
      label: 'Link 1',
      url: 'https://example.com/1',
    })
  })

  test('leaves out components and their query parameter from a Discord message without buttons', async ({
    assert,
  }) => {
    const message = DiscordMessage.create().setBody('Order 42 shipped')

    await discordWebhookChannel({ webhooks: {} }).send({ message, targets: { webhookUrl } })

    assert.isFalse(requests[0].url.searchParams.has('with_components'))
    assert.notProperty(requests[0].body, 'components')
  })

  test('accepts 25 Discord link buttons and refuses a 26th, as Discord allows 5 rows of 5', ({
    assert,
  }) => {
    const message = DiscordMessage.create()
    for (let index = 1; index <= 25; index++) {
      message.addLinkButton({ label: `Link ${index}`, url: `https://example.com/${index}` })
    }

    assert.throws(
      () => message.addLinkButton({ label: 'Link 26', url: 'https://example.com/26' }),
      'A Discord message holds at most 25 link buttons',
    )
    assert.lengthOf(message.serialize().body.components!, 5)
  })
})
