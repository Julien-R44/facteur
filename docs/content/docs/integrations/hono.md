# Hono

`@facteurjs/hono` registers the [Server API](../server-api.md) on a Hono application. Notification creation and channels still use `@facteurjs/core`.

```sh
pnpm add @facteurjs/core @facteurjs/hono hono
```

Configure Facteur with a top-level database adapter and run discovery (see [Configuration](../configuration.md)), then register the routes:

```ts
import { Hono } from 'hono'
import { createHonoFacteurServer } from '@facteurjs/hono'
import { facteur } from './facteur.js'
import { authorizeNotificationRequest } from './authorization.js'

const app = new Hono()

createHonoFacteurServer({
  app,
  facteur,
  authorize: ({ notifiableId, tenantId, ctx }) =>
    authorizeNotificationRequest({ notifiableId, tenantId, ctx }),
})

export default app
```

`authorizeNotificationRequest` is application code, not a Facteur export. It must authenticate the caller, validate user/tenant access, and check the body’s notification ownership for `mark-as`. Read the [Server API security limitations](../server-api.md#authorization-is-required) before exposing the routes.

The callback receives the full Hono `Context` as `ctx`, allowing access to authentication middleware, headers and request data. It may return a boolean or a promise of a boolean. Install your authentication middleware before registering the routes.

`HonoServerAdapter` is also exported if you need the lower-level `createFacteurServer()` API. Most applications should use `createHonoFacteurServer()` instead of reimplementing the adapter. This integration does not create a listening server or a realtime connection; run the Hono app using your runtime's normal server setup and configure Socket.IO or another channel separately.
