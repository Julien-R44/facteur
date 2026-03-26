import { checkAuthorization, UNAUTHORIZED_RESPONSE } from './utils.ts'
import { defineRoute } from '../index.ts'

function validatePreferences(preferences: unknown): { valid: true } | { valid: false; error: string } {
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
    return { valid: false, error: 'Preferences must be an object' }
  }

  for (const [channel, value] of Object.entries(preferences)) {
    if (typeof value !== 'boolean') {
      return { valid: false, error: `Channel "${channel}" preference must be a boolean, got ${typeof value}` }
    }
  }

  return { valid: true }
}

export const getPreferencesRoute = defineRoute(({ facteur, authorize }) => ({
  method: 'get',
  route: '/notifications/notifiable/:notifiableId/preferences',
  handler: async (request) => {
    const notifiableId = request.params.notifiableId
    const tenantId = request.query.tenantId

    const isAuthorized = await checkAuthorization({ authorize, request, notifiableId, tenantId })
    if (!isAuthorized) return UNAUTHORIZED_RESPONSE

    const preferences = await facteur.db.getPreferences({ notifiableId, tenantId })

    return { status: 200, body: preferences || {} }
  },
}))

export const updatePreferencesRoute = defineRoute(({ facteur, authorize }) => ({
  method: 'post',
  route: '/notifications/notifiable/:notifiableId/preferences',
  handler: async (request) => {
    const notifiableId = request.params.notifiableId
    const tenantId = request.body.tenantId
    const preferences = request.body.preferences
    const notificationName = request.body.notificationName
    const category = request.body.category

    const isAuthorized = await checkAuthorization({ authorize, request, notifiableId, tenantId })
    if (!isAuthorized) return UNAUTHORIZED_RESPONSE

    if (notificationName && category) {
      return {
        status: 400,
        body: { error: 'Cannot specify both "notificationName" and "category"' },
      }
    }

    if (!preferences) {
      return { status: 400, body: { error: 'Preferences are required' } }
    }

    const validation = validatePreferences(preferences)
    if (!validation.valid) return { status: 400, body: { error: validation.error } }

    /**
     * Per-category scope: resolve notifications in category and update each one
     */
    if (category) {
      const identities = await facteur.discoverer.getNotificationIdentities()
      const matching = identities.filter((n) => n.category === category)

      if (matching.length === 0) {
        return {
          status: 400,
          body: { error: `No notifications found for category "${category}"` },
        }
      }

      for (const identity of matching) {
        await facteur.db.updatePreferences({
          notifiableId,
          tenantId,
          notificationName: identity.identifier,
          channelPreferences: preferences,
        })
      }

      return { status: 204, body: {} }
    }

    /**
     * Global scope (no notificationName) or per-notification scope
     */
    await facteur.db.updatePreferences({
      notifiableId,
      tenantId,
      notificationName,
      channelPreferences: preferences,
    })

    return { status: 204, body: {} }
  },
}))
