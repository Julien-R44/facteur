# Custom HTTP Adapter

As a reminder, Facteur comes with a full set of pre-configured HTTP routes to handle notifications, user preferences, etc. in a generic way: these routes are not coupled to any particular HTTP framework.

We have 2 built-in adapters: one for Hono, and one for AdonisJS. But you can very easily write your own adapter for any HTTP framework, like Express, Fastify, etc.

Here's an example of an adapter for Hono:

```ts
import type { RouteDefinition, ServerAdapter } from '@facteurjs/core/api/types'
import type { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export class HonoServerAdapter implements ServerAdapter {
  constructor(protected app: Hono) {}

  setRoutes(routes: RouteDefinition[]) {
    for (const route of routes) {
      const method = route.method.toUpperCase()
      const pattern = route.route

      this.app[method.toLowerCase() as 'get' | 'post'](pattern, async (c) => {
        const result = await route.handler({
          body: c.req.json(),
          params: c.req.param(),
          query: c.req.query(),
          headers: c.req.header(),
        })

        return c.json(result.body, result.status as ContentfulStatusCode)
      })
    }
  }
}
```

Several things to note:
- We need to implement Facteur's `ServerAdapter` interface, which requires us to define the `setRoutes` method.
- `setRoutes` receives an array of `RouteDefinition`, which contains the HTTP method, the route pattern, and the handler to call.
- Then it's simple, just use your HTTP framework's methods to register the routes. Here we use Hono, but you can do the same with Express, Fastify, etc.

Once the adapter is created, we can use it to create our Facteur server in our application:

```ts
import { createFacteurServer } from '@facteurjs/core/api'
import { HonoServerAdapter } from './hono-server-adapter.ts'
import { facteur } from './facteur.ts'

import { Hono } from 'hono'

const app = new Hono()
import { serve } from 'hono/http'

const adapter = new HonoServerAdapter(app)
const server = createFacteurServer({ adapter, facteur, })
```

All good. Happy to accept Pull Requests to add adapters for other HTTP frameworks.
