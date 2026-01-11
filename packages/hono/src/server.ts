import type { Context, Hono } from 'hono'
import type { Facteur } from '@facteurjs/core'

import { createFacteurServer } from '@facteurjs/core/api'

import type { HonoAuthorizationCallback } from './types.ts'

import { HonoServerAdapter } from './adapter.ts'

export interface CreateHonoFacteurServerOptions {
  app: Hono
  facteur: Facteur<any, any>

  /**
   * Authorization callback to verify that the requester has access to the requested resources.
   * This callback is required to ensure proper access control.
   */
  authorize: HonoAuthorizationCallback
}

/**
 * Create and register Facteur routes on a Hono app with authorization support.
 */
export function createHonoFacteurServer(options: CreateHonoFacteurServerOptions) {
  const { app, facteur, authorize } = options

  if (!authorize) {
    throw new Error(
      'Authorization callback is required. You must provide an authorize function to control access to notification resources.',
    )
  }

  const adapter = new HonoServerAdapter(app)

  createFacteurServer({
    facteur,
    adapter,
    authorize: (context) => {
      const ctx = context.request.context as Context
      return authorize({
        notifiableId: context.notifiableId,
        tenantId: context.tenantId,
        ctx,
      })
    },
  })
}
