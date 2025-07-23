import type { Facteur } from '@facteurjs/core'

export type HTTPMethod = 'get' | 'post' | 'put' | 'patch'

export interface HTTPRequest {
  body: Record<string, any>
  params: Record<string, any>
  query: Record<string, any>
}

export interface HTTPResponse {
  status: number
  body: Record<string, any>
}

export interface RouteDefinition {
  method: HTTPMethod
  route: string
  handler: (request: HTTPRequest) => Promise<HTTPResponse>
}

export interface ServerAdapter {
  setRoutes(routes: RouteDefinition[]): void
}

export const routes: RouteDefinition[] = [
  {
    method: 'get',
    route: '/users/:id/notifications',
    handler: async (request) => {
      const userId = request.params.id
      return {
        status: 200,
        body: {
          notifications: [`Notification 1 for user ${userId}`, `Notification 2 for user ${userId}`],
        },
      }
    },
  },
]

export function createFacteurServer(options: { adapter: ServerAdapter; facteur: Facteur<any> }) {
  const { adapter, facteur } = options

  adapter.setRoutes(routes)
}
