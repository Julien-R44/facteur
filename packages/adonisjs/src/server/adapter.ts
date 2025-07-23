import type { HttpRouterService } from '@adonisjs/core/types'
import type { RouteDefinition, ServerAdapter } from '@facteurjs/core/api'

export class AdonisServerAdapter implements ServerAdapter {
  constructor(private router: HttpRouterService) {}

  setRoutes(routes: RouteDefinition[]) {
    for (const route of routes) {
      const pattern = route.route
      const method = route.method.toUpperCase()

      this.router.route(pattern, [method], async ({ request, response }) => {
        const result = await route.handler({
          body: request.body(),
          params: request.params(),
          query: request.qs(),
        })

        return response.status(result.status).send(result.body)
      })
    }
  }
}
