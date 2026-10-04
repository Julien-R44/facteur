# Discord Channel

The Discord channel allows you to send notifications to Discord channels via webhooks. This channel is built on top of the [Webhook channel](./webhook.md) and supports all webhook features. It uses the Discord Webhooks API.

## Batching

This channel does **not support batching**. Each notification is sent individually.

## Configuration

```ts
import { createFacteur } from '@facteurjs/core'
import { discordWebhookChannel } from '@facteurjs/core/channels/discord'

export const facteur = createFacteur({
  discoverer: { searchDirectory: new URL('./notifications/', import.meta.url) },
  channels: {
    discord: discordWebhookChannel({
      // You can define multiple Discord webhooks, each with a unique name
      webhooks: {
        general: 'https://discord.com/api/webhooks/YOUR/WEBHOOK/URL',
        alerts: 'https://discord.com/api/webhooks/YOUR/ALERT/WEBHOOK',
        announcements: 'https://discord.com/api/webhooks/YOUR/ANNOUNCEMENT/WEBHOOK',
      },
    }),
  },
})
```

You can define multiple Discord webhooks, each with a unique name, or just a single default webhook. This is useful when you want to send certain notifications to specific Discord channels.

## Configuration Options

Since the Discord channel uses the webhook channel internally, it supports the same configuration options:

- **`webhooks`** (optional): An object defining multiple named Discord webhooks
- **`webhookUrl`** (optional): A single default Discord webhook URL

Provide either `webhooks` or `webhookUrl`, not both. If both exist at runtime, `webhookUrl` takes precedence.

## Targets

The Discord channel targets work exactly like [webhook targets](./webhook.md#targets):

```ts
// Send to specific named webhooks
await facteur
  .notification(MyNotification)
  .via({
    discord: {
      general: true,
      announcements: true,
    },
  })
  .send()

// Or send to an arbitrary Discord webhook URL
await facteur
  .notification(MyNotification)
  .via({
    discord: {
      webhookUrl: 'https://discord.com/api/webhooks/CUSTOM/WEBHOOK',
    },
  })
  .send()
```

### Target Properties

- **Named webhooks**: Include only the names to call. The current implementation selects keys even when their value is `false`; omit a name to exclude it.
- **`webhookUrl`** (optional): Send to an arbitrary Discord webhook URL

## Discord Message Features

When creating notifications for Discord, you can use rich embed features:

```ts
import { Notification } from '@facteurjs/core/types'
import { DiscordMessage } from '@facteurjs/core/channels/discord'

export default class DiscordNotification extends Notification<undefined> {
  asDiscordMessage() {
    return DiscordMessage.create()
      .setBody('Hello from Facteur!')
      .addEmbed((embed) => {
        embed
          .setTitle('Notification Title')
          .setDescription('This is a rich embed')
          .setColor('#5865F2')
          .addField({ name: 'Field 1', value: 'Value 1', inline: true })
          .addField({ name: 'Field 2', value: 'Value 2', inline: true })
      })
      .setBotUsername('Bot Name')
      .setBotAvatar('https://example.com/avatar.png')
  }
}
```

For more details about webhook configuration and targeting, see the [Webhook channel documentation](./webhook.md).
