import type { Facteur } from '../facteur.js'

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

export const routes = (facteur: Facteur<any, any>) =>
  [
    {
      method: 'get',
      route: '/notifications/notifiable/:id/notifications',
      handler: async (request) => {
        const userId = request.params.id

        const notifications = await facteur.db.getNotifications({
          notifiableId: userId,
          tenantId: request.query.tenantId,
          page: request.query.page,
          limit: request.query.limit,
          type: request.query.type,
        })

        return { status: 200, body: notifications || [] }
      },
    },
    {
      method: 'post',
      route: '/notifications/notifiable/:id/mark-as',
      handler: async (request) => {
        const notificationId = request.body.notificationId
        const status = request.body.status

        if (!status) return { status: 400, body: { error: 'Status is required' } }
        if (!notificationId) return { status: 400, body: { error: 'Notification ID is required' } }

        await facteur.db.updateNotification({ id: notificationId, status })

        return { status: 204, body: {} }
      },
    },
    {
      method: 'post',
      route: '/notifications/notifiable/:id/mark-all',
      handler: async (request) => {
        const status = request.body.status
        if (!status) return { status: 400, body: { error: 'Status is required' } }

        await facteur.db.updateAllNotifications({
          notifiableId: request.params.id,
          tenantId: request.body.tenantId,
          status,
        })

        return { status: 204, body: {} }
      },
    },
  ] satisfies RouteDefinition[]

export function createFacteurServer(options: {
  adapter: ServerAdapter
  facteur: Facteur<any, any>
}) {
  const { adapter, facteur } = options

  adapter.setRoutes(routes(facteur))
}
