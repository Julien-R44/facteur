import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { Hono } from 'hono'
import type { RouteDefinition, ServerAdapter } from '@facteurjs/core/api/types'

export class HonoServerAdapter implements ServerAdapter {
  constructor(protected app: Hono) {}

  setRoutes(routes: RouteDefinition[]) {
    for (const route of routes) {
      const method = route.method.toUpperCase()
      const pattern = route.route

      this.app[method.toLowerCase() as 'get' | 'post'](pattern, async (c) => {
        const body = await c.req.json().catch(() => ({}))
        const result = await route.handler({
          body,
          params: c.req.param(),
          query: c.req.query(),
          headers: c.req.header(),
          context: c,
        })

        return c.json(result.body, result.status as ContentfulStatusCode)
      })
    }
  }
}
