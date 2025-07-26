import { defineRoute } from '../index.js'

export const getPreferencesRoute = defineRoute(({ facteur }) => ({
  method: 'get',
  route: '/notifications/notifiable/:notifiableId/preferences',
  handler: async (request) => {
    const userId = request.params.notifiableId

    const preferences = await facteur.db.getPreferences({
      notifiableId: userId,
      tenantId: request.query.tenantId,
    })

    return { status: 200, body: preferences || {} }
  },
}))

export const updatePreferencesRoute = defineRoute(({ facteur }) => ({
  method: 'post',
  route: '/notifications/notifiable/:notifiableId/preferences',
  handler: async (request) => {
    const userId = request.params.notifiableId
    const preferences = request.body.preferences

    if (!preferences) {
      return { status: 400, body: { error: 'Preferences are required' } }
    }

    await facteur.db.updatePreferences({
      notifiableId: userId,
      tenantId: request.body.tenantId,
      notificationName: request.body.notificationName,
      channelPreferences: preferences,
    })

    return { status: 204, body: {} }
  },
}))
