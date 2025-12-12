import type { Identifier } from '../database/types.js'

export type HTTPMethod = 'get' | 'post' | 'put' | 'patch'

export interface HTTPRequest<Context = unknown> {
  body: Record<string, any>
  params: Record<string, any>
  query: Record<string, any>
  headers: Record<string, string | undefined>

  /**
   * Framework-specific context (e.g., AdonisJS HttpContext, Hono Context).
   * Use this to access framework-specific features like authentication.
   */
  context?: Context
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

/**
 * Context passed to the authorization callback
 */
export interface AuthorizationContext {
  /**
   * The notifiable ID from the request (URL param)
   */
  notifiableId: Identifier

  /**
   * The tenant ID from the request (query or body)
   */
  tenantId: Identifier | undefined

  /**
   * The HTTP request object
   */
  request: HTTPRequest
}

/**
 * Callback to authorize a request.
 * Should return true if the request is authorized, false otherwise.
 * Can also throw an error to provide a custom error response.
 */
export type AuthorizationCallback = (context: AuthorizationContext) => Promise<boolean> | boolean
