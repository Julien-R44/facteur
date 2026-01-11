# Discord Channel

The Discord channel allows you to send notifications to Discord channels via webhooks. This channel is built on top of the [Webhook channel](./webhook.md) and supports all webhook features.

## Configuration

```ts
import { defineConfig } from 'facteur'
import { discordWebhookChannel } from '@facteurjs/adonisjs/channels/discord'

export default defineConfig({
  channels: {
    discord: discordWebhookChannel({
      // You can define multiple Discord webhooks, each with a unique name
      webhooks: {
        general: 'https://discord.com/api/webhooks/YOUR/WEBHOOK/URL',
        alerts: 'https://discord.com/api/webhooks/YOUR/ALERT/WEBHOOK',
        announcements: 'https://discord.com/api/webhooks/YOUR/ANNOUNCEMENT/WEBHOOK',
      },

      // Or just a single default webhook
      webhookUrl: 'https://discord.com/api/webhooks/YOUR/DEFAULT/WEBHOOK',
    })
  },
})
```

You can define multiple Discord webhooks, each with a unique name, or just a single default webhook. This is useful when you want to send certain notifications to specific Discord channels.

## Configuration Options

Since the Discord channel uses the webhook channel internally, it supports the same configuration options:

- **`webhooks`** (optional): An object defining multiple named Discord webhooks
- **`webhookUrl`** (optional): A single default Discord webhook URL

You must provide either `webhooks` or `webhookUrl`.

## Targets

The Discord channel targets work exactly like [webhook targets](./webhook.md#targets):

```ts
// Send to specific named webhooks
await facteur
  .notification(MyNotification)
  .via({
    discord: {
      general: true,
      alerts: false,
      announcements: true
    }
  })
  .send()

// Or send to an arbitrary Discord webhook URL
await facteur
  .notification(MyNotification)
  .via({
    discord: {
      webhookUrl: 'https://discord.com/api/webhooks/CUSTOM/WEBHOOK'
    }
  })
  .send()
```

### Target Properties

- **Named webhooks**: Boolean values for each webhook defined in configuration
- **`webhookUrl`** (optional): Send to an arbitrary Discord webhook URL

## Discord Message Features

When creating notifications for Discord, you can use rich embed features:

```ts
export default class DiscordNotification extends Notification {
  asDiscordMessage() {
    return DiscordMessage.create()
      .setContent('Hello from Facteur!')
      .addEmbed({
        title: 'Notification Title',
        description: 'This is a rich embed',
        color: '#5865F2',
        fields: [
          { name: 'Field 1', value: 'Value 1', inline: true },
          { name: 'Field 2', value: 'Value 2', inline: true }
        ]
      })
      .setUsername('Bot Name')
      .setAvatarUrl('https://example.com/avatar.png')
  }
}
```

For more details about webhook configuration and targeting, see the [Webhook channel documentation](./webhook.md).
