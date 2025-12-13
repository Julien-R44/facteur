import type { AuthorizationCallback, RouteDefinition, ServerAdapter } from './types.js'
import type { Facteur } from '../facteur.js'

import { getPreferencesRoute, updatePreferencesRoute } from './handlers/preferences.js'
import {
  getNotificationRoute,
  markAllNotificationsAsRoute,
  markNotificationAsRoute,
} from './handlers/notifications.js'

export interface DefineRouteOptions {
  facteur: Facteur<any, any>
  authorize?: AuthorizationCallback | undefined
}

export function defineRoute(routeDefinition: (options: DefineRouteOptions) => RouteDefinition) {
  return routeDefinition
}

export const routes = (options: DefineRouteOptions) =>
  [
    // Notification routes
    getNotificationRoute(options),
    markNotificationAsRoute(options),
    markAllNotificationsAsRoute(options),
    // Preferences route
    getPreferencesRoute(options),
    updatePreferencesRoute(options),
  ] satisfies RouteDefinition[]

export interface CreateFacteurServerOptions {
  adapter: ServerAdapter
  facteur: Facteur<any, any>

  /**
   * Authorization callback to verify that the requester has access to the requested resources
   */
  authorize?: AuthorizationCallback | undefined
}

export function createFacteurServer(options: CreateFacteurServerOptions) {
  const { adapter, facteur, authorize } = options

  adapter.setRoutes(routes({ facteur, authorize }))
}
