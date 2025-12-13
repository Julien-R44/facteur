import { checkAuthorization, UNAUTHORIZED_RESPONSE } from './utils.js'
import { defineRoute } from '../index.js'

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

    const isAuthorized = await checkAuthorization({ authorize, request, notifiableId, tenantId })
    if (!isAuthorized) return UNAUTHORIZED_RESPONSE

    if (!preferences) {
      return { status: 400, body: { error: 'Preferences are required' } }
    }

    await facteur.db.updatePreferences({
      notifiableId,
      tenantId,
      notificationName: request.body.notificationName,
      channelPreferences: preferences,
    })

    return { status: 204, body: {} }
  },
}))
