# Facteur

[![npm version](https://img.shields.io/npm/v/@facteurjs/core)](https://www.npmjs.com/package/@facteurjs/core)
[![CI](https://github.com/julien-r44/facteur/actions/workflows/test.yml/badge.svg)](https://github.com/julien-r44/facteur/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**One notification, multiple delivery channels.**

Facteur is a TypeScript-first, framework-agnostic notification library for Node.js. Define a
notification once, format it for each channel, and send it to one recipient or many. Use it for
transactional messages, team alerts, or an in-app notification center.

[Documentation](https://facteur.julr.dev) · [Quick start](https://facteur.julr.dev/docs/quick-start) · [AdonisJS](https://facteur.julr.dev/docs/adonisjs) · [Hono](https://facteur.julr.dev/docs/hono)

> Requires Node.js 24 or later and uses ES modules.

## Features

- **Multi-channel delivery** — SMS, push, chat, webhooks, realtime, database storage, and AdonisJS Mail.
- **Typed notifications** — recipient models, notification parameters, and fluent message builders.
- **In-app notifications** — database-backed history, read/seen status, an HTTP API, and frontend SDKs.
- **Preferences and tenants** — user channel preferences and tenant-scoped notifications.
- **Bulk sending and retries** — send to multiple recipients, configure retries and timeouts, and
  opt into native FCM/Expo batching.
- **Extensible and testable** — custom channels, lifecycle hooks, events, and a built-in fake for tests.

## Installation

```sh
npm install @facteurjs/core
```

Or with pnpm:

```sh
pnpm add @facteurjs/core
```

Provider SDKs are optional peer dependencies: install only those your channels need. For example,
Twilio requires `twilio` and Web Push requires `web-push`. The Slack example below needs no extra SDK.

## Quick start

Set `SLACK_WEBHOOK_URL` to a Slack Incoming Webhook URL, then configure a channel, define a
notification, and send it:

```ts
import { createFacteur } from '@facteurjs/core'
import { SlackMessage, slackWebhookChannel } from '@facteurjs/core/channels/slack'
import {
  Notification,
  type InferChannelsFromConfig,
  type NotifiableTargets,
  type NotificationOptions,
} from '@facteurjs/core/types'

const facteur = createFacteur({
  discoverer: { searchDirectory: new URL('./notifications/', import.meta.url) },
  channels: {
    slack: slackWebhookChannel({
      webhooks: { billing: process.env.SLACK_WEBHOOK_URL! },
    }),
  },
})

declare module '@facteurjs/core/types' {
  interface NotificationChannels extends InferChannelsFromConfig<typeof facteur> {}
}

class User {
  constructor(public name: string) {}

  notificationTargets(): NotifiableTargets {
    return { slack: { billing: true } }
  }
}

class InvoicePaidNotification extends Notification<User, { amount: number }> {
  static options: NotificationOptions<User> = {
    name: 'Invoice Paid',
    category: 'billing',
    deliverBy: { slack: true },
  }

  asSlackMessage() {
    return SlackMessage.create().setText(
      `Invoice paid by ${this.notifiable.name}: €${this.params.amount}.`,
    )
  }
}

await facteur
  .notification(InvoicePaidNotification)
  .to(new User('Alice'))
  .params({ amount: 42 })
  .send()
```

The recipient supplies the channel targets; the notification supplies the content. Add a channel
and its `as…Message()` method to deliver the same notification elsewhere.

This example sends directly using the class, so discovery is not needed. For preferences and
category management, default-export classes from `*_notification.ts` files and call
`await facteur.discoverer.discoverNotifications()` at startup. See the
[configuration guide](https://facteur.julr.dev/docs/configuration).

## Supported channels

| Channel  | Providers                                                                                                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email    | [AdonisJS Mail](https://facteur.julr.dev/docs/mail) (via `@facteurjs/adonisjs`)                                                                                            |
| SMS      | [Twilio](https://facteur.julr.dev/docs/twilio), [AWS SNS](https://facteur.julr.dev/docs/aws-sns)                                                                           |
| Push     | [Firebase Cloud Messaging](https://facteur.julr.dev/docs/fcm), [Expo](https://facteur.julr.dev/docs/expo-notifications), [Web Push](https://facteur.julr.dev/docs/webpush) |
| Chat     | [Slack](https://facteur.julr.dev/docs/slack), [Discord](https://facteur.julr.dev/docs/discord)                                                                             |
| Realtime | [Socket.IO](https://facteur.julr.dev/docs/socketio), [Transmit (SSE)](https://facteur.julr.dev/docs/transmit)                                                              |
| Webhooks | [HTTP webhooks](https://facteur.julr.dev/docs/webhook)                                                                                                                     |
| Database | [Knex and Kysely](https://facteur.julr.dev/docs/database), Lucid via `@facteurjs/adonisjs`                                                                                 |

Need another provider? Implement a [custom channel](https://facteur.julr.dev/docs/custom-channels).

## Packages

| Package                                      | Purpose                                                                             |
| -------------------------------------------- | ----------------------------------------------------------------------------------- |
| [`@facteurjs/core`](./packages/core)         | Notification delivery, channels, database adapters, and Server API                  |
| [`@facteurjs/adonisjs`](./packages/adonisjs) | AdonisJS configuration, dependency injection, Mail, Lucid, and Transmit integration |
| [`@facteurjs/hono`](./packages/hono)         | Register the Server API on a Hono application                                       |
| [`@facteurjs/client`](./packages/client)     | Framework-independent JavaScript client for notifications and preferences           |
| [`@facteurjs/react`](./packages/react)       | React hooks powered by TanStack Query                                               |

To build a notification center, start with the
[in-app notifications guide](https://facteur.julr.dev/docs/in-app-notifications). Configure database
storage and a realtime channel, expose the Server API, then use the client or React hooks in your UI.
Your application handles authentication, authorization, and realtime subscriptions; read the
[Server API security requirements](https://facteur.julr.dev/docs/server-api#authorization-is-required)
before exposing its routes.

## Contributing

Use Node.js 24+ and the pnpm version specified in `package.json`.

```sh
git clone https://github.com/julien-r44/facteur.git
cd facteur
pnpm install
pnpm build
pnpm checks
pnpm test
```

Database and integration tests require local services; `compose.yml` defines PostgreSQL, MySQL,
Redis, and Mailpit. To start them with Docker Compose, run `docker compose up -d`.

Bug reports and pull requests are welcome on [GitHub](https://github.com/julien-r44/facteur/issues).

## License and support

MIT © Julien Ripouteau.

If Facteur helps your project, [consider sponsoring its development](https://github.com/sponsors/Julien-R44).
