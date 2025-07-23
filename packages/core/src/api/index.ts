import type { Facteur } from '../facteur.js'
import type { RouteDefinition, ServerAdapter } from './types.js'
import {
  getNotificationRoute,
  markAllNotificationsAsRoute,
  markNotificationAsRoute,
} from './handlers/notifications.js'

export function defineRoute(
  routeDefinition: (options: { facteur: Facteur<any, any> }) => RouteDefinition,
) {
  return routeDefinition
}

export const routes = (facteur: Facteur<any, any>) =>
  [
    getNotificationRoute({ facteur }),
    markNotificationAsRoute({ facteur }),
    markAllNotificationsAsRoute({ facteur }),
  ] satisfies RouteDefinition[]

export function createFacteurServer(options: {
  adapter: ServerAdapter
  facteur: Facteur<any, any>
}) {
  const { adapter, facteur } = options

  adapter.setRoutes(routes(facteur))
}
