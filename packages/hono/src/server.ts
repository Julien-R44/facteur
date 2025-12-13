import type { Context, Hono } from 'hono'
import type { Facteur } from '@facteurjs/core'
import type { HonoAuthorizationCallback } from './types.js'
import { createFacteurServer } from '@facteurjs/core/api'
import { HonoServerAdapter } from './adapter.js'

export interface CreateHonoFacteurServerOptions {
  app: Hono
  facteur: Facteur<any, any>

  /**
   * Authorization callback to verify that the requester has access to the requested resources.
   * If not provided, all requests will be allowed (NOT RECOMMENDED for production).
   */
  authorize?: HonoAuthorizationCallback | undefined
}

/**
 * Create and register Facteur routes on a Hono app with authorization support.
 */
export function createHonoFacteurServer(options: CreateHonoFacteurServerOptions) {
  const { app, facteur, authorize } = options
  const adapter = new HonoServerAdapter(app)

  createFacteurServer({
    facteur,
    adapter,
    authorize: authorize
      ? (context) => {
          const ctx = context.request.context as Context
          return authorize({
            notifiableId: context.notifiableId,
            tenantId: context.tenantId,
            ctx,
          })
        }
      : undefined,
  })
}
