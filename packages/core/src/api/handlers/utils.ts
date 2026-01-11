import type { HTTPRequest, HTTPResponse } from '../types.ts'
import type { DefineRouteOptions } from '../index.ts'

export const UNAUTHORIZED_RESPONSE: HTTPResponse = { status: 403, body: { error: 'Unauthorized' } }

export async function checkAuthorization(options: {
  authorize: DefineRouteOptions['authorize']
  request: HTTPRequest
  notifiableId: string | number
  tenantId?: string | number
}): Promise<boolean> {
  return options.authorize({
    notifiableId: options.notifiableId,
    tenantId: options.tenantId,
    request: options.request,
  })
}

export function parseJsonSafe(value: string | undefined): any {
  if (!value) return undefined

  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}
