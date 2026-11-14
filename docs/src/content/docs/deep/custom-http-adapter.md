# Custom HTTP Adapter

Facteur provides framework-independent route definitions through `@facteurjs/core/api`. Built-in integrations are available for [Hono](../integrations/hono.md) and [AdonisJS](../integrations/adonisjs.md). For another framework, implement `ServerAdapter.setRoutes()`.

The following Hono implementation illustrates the adapter contract (normally use `@facteurjs/hono`):

```ts
import type { RouteDefinition, ServerAdapter } from '@facteurjs/core/api/types'
import type { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export class HonoServerAdapter implements ServerAdapter {
  constructor(protected app: Hono) {}

  setRoutes(routes: RouteDefinition[]) {
    for (const route of routes) {
      this.app.on(route.method.toUpperCase(), route.route, async (ctx) => {
        const body = route.method === 'get' ? {} : await ctx.req.json()
        const result = await route.handler({
          body,
          params: ctx.req.param(),
          query: ctx.req.query(),
          headers: ctx.req.header(),
          context: ctx,
        })

        if (result.status === 204) return ctx.body(null, 204)
        return ctx.json(result.body, result.status as ContentfulStatusCode)
      })
    }
  }
}
```

Parse and **await** the JSON body before calling a handler, map URL parameters/query/headers, and forward the framework context for authentication. Handle invalid JSON and exceptions using your framework's error handling. A `204` response should have no body. `setRoutes()` only registers handlers; it does not start a server.

## Register the routes

```ts
import { Hono } from 'hono'
import { createFacteurServer } from '@facteurjs/core/api'
import { HonoServerAdapter } from './hono-server-adapter.js'
import { facteur } from './facteur.js'
import { authorizeNotificationRequest } from './authorization.js'

const app = new Hono()

createFacteurServer({
  adapter: new HonoServerAdapter(app),
  facteur,
  authorize: ({ notifiableId, tenantId, request }) =>
    authorizeNotificationRequest({ notifiableId, tenantId, request }),
})
```

`authorize` is mandatory. Your application helper must authenticate the caller and validate access to user/tenant resources. The generic callback receives `request.context`, not a top-level `ctx`. For `mark-as`, also verify ownership of the body’s notification ID; the built-in update is scoped only by ID. See [Server API](../server-api.md) for routes and security limitations.
