# AdonisJS

`@facteurjs/adonisjs` integrates Facteur with AdonisJS configuration, dependency injection, Lucid, Mail and Transmit.

## Installation

```sh
node ace add @facteurjs/adonisjs
```

The configure hook creates `config/notifications.ts`, registers `@facteurjs/adonisjs/facteur_provider`, adds the `#notifications/*` import alias, and creates migrations for notifications and preferences. Review the generated migrations, then run them against your development database:

```sh
node ace migration:run
```

The default configuration uses Lucid and Mail. Install/configure `@adonisjs/lucid` and `@adonisjs/mail` if you keep those channels, or remove them and configure only the providers your application uses.

## Configuration

Adonis configuration requires config providers from `channels`, not raw channel instances:

```ts
import { defineConfig, channels } from '@facteurjs/adonisjs'
import { databases } from '@facteurjs/adonisjs/database'
import type { InferChannels } from '@facteurjs/adonisjs/types'

const config = defineConfig({
  databaseAdapter: databases.lucid({}),
  channels: {
    database: channels.database({}),
    mail: channels.mail(),
  },
})

export default config

declare module '@facteurjs/adonisjs/types' {
  interface NotificationChannels extends InferChannels<typeof config> {}
}
```

`databases.lucid()` configures the database API/preferences layer; `channels.database()` configures message storage. Configure both for in-app notifications. They accept `connectionName` and custom `tableNames`. Kysely is available through `databases.kysely({ connection })` and `channels.kysely({ connection })`; the current Adonis Kysely wrappers do not forward custom table names.

Other factories include `channels.twilio()`, `webpush()`, `fcm()`, `expo()`, `awsSns()`, `socketIo()`, `slackWebhook()` and `discordWebhook()`, with the corresponding channel options. `channels.transmit()` and `channels.mail()` resolve their services from the container without an options object.

The current Adonis provider does not forward `preferences` or `queueAdapter` from `config/notifications.ts` to the core instance. `api.guard` does not register or secure routes; use the explicit authorization callback below. There is no automatic queue delivery API yet.

## Notifications and sending

Create `app/notifications/invoice_paid_notification.ts` manually using [Creating Notifications](../notifications.md). The provider discovers `_notification.ts`/`_notification.js` files under `app` and uses the container to instantiate classes, so constructor injection is supported. The repository's `make:notification` command currently references a missing stub path and is not a reliable setup step.

```ts
import notifications from '@facteurjs/adonisjs/services/main'
import InvoicePaidNotification from '#notifications/invoice_paid_notification'

await notifications.notification(InvoicePaidNotification).to(user).params({ amount: 100 }).send()
```

## API routes

Register routes explicitly, for example in `start/routes.ts`:

```ts
import notifications from '@facteurjs/adonisjs/services/main'
import { authorizeNotificationRequest } from '#services/notification_authorization'

notifications.registerRoutes({
  authorize: ({ notifiableId, tenantId, ctx }) =>
    authorizeNotificationRequest({ notifiableId, tenantId, ctx }),
})
```

`authorizeNotificationRequest` is your application helper, not a Facteur export. `ctx` is the AdonisJS `HttpContext`. Authenticate the caller and validate user/tenant access, plus notification ownership for `mark-as`. See [Server API](../server-api.md#authorization-is-required); an always-true callback is not suitable for production.

Facteur emits events through the Adonis emitter. See [Events](../deep/events.md) and [Testing](../testing.md) for listeners and fakes.
