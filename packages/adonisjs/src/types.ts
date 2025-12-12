import type { HttpContext } from '@adonisjs/core/http'
import type { ConfigProvider } from '@adonisjs/core/types'
import type { Identifier } from '@facteurjs/core/database/types'

export * from '@facteurjs/core/types'

export type InferChannels<T> = T extends { channels: infer Channels }
  ? {
      [K in keyof Channels]: Channels[K] extends ConfigProvider<infer P> ? P : never
    }
  : never

/**
 * Context passed to the AdonisJS authorization callback.
 * Includes the full HttpContext for accessing auth, session, etc.
 */
export interface AdonisAuthorizationContext {
  notifiableId: Identifier
  tenantId: Identifier | undefined
  ctx: HttpContext
}

/**
 * Authorization callback for AdonisJS.
 * Use `ctx.auth.user` to get the authenticated user.
 */
export type AdonisAuthorizationCallback = (
  context: AdonisAuthorizationContext,
) => Promise<boolean> | boolean
