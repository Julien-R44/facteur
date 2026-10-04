# Slack Channel

The Slack channel allows you to send notifications to Slack channels via webhooks. This channel is built on top of the [Webhook channel](./webhook.md) and supports all webhook features. It uses the Slack Incoming Webhooks API.

## Batching

This channel does **not support batching**. Each notification is sent individually.

## Configuration

```ts
import { createFacteur } from '@facteurjs/core'
import { slackWebhookChannel } from '@facteurjs/core/channels/slack'

export const facteur = createFacteur({
  discoverer: { searchDirectory: new URL('./notifications/', import.meta.url) },
  channels: {
    slack: slackWebhookChannel({
      // You can define multiple Slack webhooks, each with a unique name
      webhooks: {
        general: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
        alerts: 'https://hooks.slack.com/services/YOUR/ALERT/WEBHOOK',
        marketing: 'https://hooks.slack.com/services/YOUR/MARKETING/WEBHOOK',
      },
    }),
  },
})
```

You can define multiple Slack webhooks, each with a unique name, or just a single default webhook. This is useful when you want to send certain notifications to specific Slack channels.

## Configuration Options

Since the Slack channel uses the webhook channel internally, it supports the same configuration options:

- **`webhooks`** (optional): An object defining multiple named Slack webhooks
- **`webhookUrl`** (optional): A single default Slack webhook URL

Provide either `webhooks` or `webhookUrl`, not both. If both exist at runtime, `webhookUrl` takes precedence and the named webhooks are not registered.

## Targets

The Slack channel targets work exactly like [webhook targets](./webhook.md#targets):

```ts
// Send to specific named webhooks
await facteur
  .notification(MyNotification)
  .via({
    slack: {
      general: true,
      marketing: true,
    },
  })
  .send()

// Or send to an arbitrary Slack webhook URL
await facteur
  .notification(MyNotification)
  .via({
    slack: {
      webhookUrl: 'https://hooks.slack.com/services/CUSTOM/TENANT/WEBHOOK',
    },
  })
  .send()
```

### Target Properties

- **Named webhooks**: Include only the names to call. The current implementation selects keys regardless of their boolean value: omit a name to exclude it; `false` does not disable it.
- **`webhookUrl`** (optional): Send to an arbitrary Slack webhook URL

## Slack Message Features

When creating notifications for Slack, you can use rich formatting features:

```ts
import { Notification } from '@facteurjs/core/types'
import { SlackMessage } from '@facteurjs/core/channels/slack'

export default class SlackNotification extends Notification<undefined> {
  asSlackMessage() {
    return SlackMessage.create()
      .setText('Hello from Facteur!')
      .setChannel('#general')
      .setBotUsername('Bot Name')
      .setBotIconEmoji(':robot_face:')
  }
}
```

For more details about webhook configuration and targeting, see the [Webhook channel documentation](./webhook.md).
