import type { RouteDefinition, ServerAdapter } from '@facteurjs/core/api/types'
import type { HttpRouterService } from '@adonisjs/core/types'

export class AdonisServerAdapter implements ServerAdapter {
  constructor(private router: HttpRouterService) {}

  setRoutes(routes: RouteDefinition[]) {
    for (const route of routes) {
      const pattern = route.route
      const method = route.method.toUpperCase()

      this.router.route(pattern, [method], async (ctx) => {
        const result = await route.handler({
          body: ctx.request.body(),
          params: ctx.request.params(),
          query: ctx.request.qs(),
          headers: ctx.request.headers() as Record<string, string | undefined>,
          context: ctx,
        })

        return ctx.response.status(result.status).send(result.body)
      })
    }
  }
}
