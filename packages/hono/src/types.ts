import type { Context } from 'hono'
import type { Identifier } from '@facteurjs/core/database/types'

export * from '@facteurjs/core/types'

/**
 * Context passed to the Hono authorization callback.
 * Includes the full Hono Context for accessing auth, session, etc.
 */
export interface HonoAuthorizationContext {
  notifiableId: Identifier
  tenantId: Identifier | undefined
  ctx: Context
}

/**
 * Authorization callback for Hono.
 * Use `ctx` to access the Hono context for auth verification.
 */
export type HonoAuthorizationCallback = (
  context: HonoAuthorizationContext,
) => Promise<boolean> | boolean
