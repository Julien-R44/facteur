import { defineRoute } from '../index.js'
import { checkAuthorization, parseJsonSafe, UNAUTHORIZED_RESPONSE } from './utils.js'

/**
 * Get all notifications for a given user
 */
export const getNotificationRoute = defineRoute(({ facteur, authorize }) => ({
  method: 'get',
  route: '/notifications/notifiable/:notifiableId/notifications',
  handler: async (request) => {
    const notifiableId = request.params.notifiableId
    const tenantId = request.query.tenantId

    const isAuthorized = await checkAuthorization({ authorize, request, notifiableId, tenantId })
    if (!isAuthorized) return UNAUTHORIZED_RESPONSE

    const notifications = await facteur.db.getNotifications({
      notifiableId,
      tenantId,
      page: request.query.page,
      limit: request.query.limit,
      status: request.query.status,
      tags: parseJsonSafe(request.query.tags),
    })

    return { status: 200, body: notifications || [] }
  },
}))

/**
 * Mark a specific notification as read or seen
 */
export const markNotificationAsRoute = defineRoute(({ facteur, authorize }) => ({
  method: 'post',
  route: '/notifications/notifiable/:notifiableId/mark-as',
  handler: async (request) => {
    const notifiableId = request.params.notifiableId
    const tenantId = request.body.tenantId
    const notificationId = request.body.notificationId
    const status = request.body.status

    const isAuthorized = await checkAuthorization({ authorize, request, notifiableId, tenantId })
    if (!isAuthorized) return UNAUTHORIZED_RESPONSE

    if (!status) return { status: 400, body: { error: 'Status is required' } }
    if (!notificationId) return { status: 400, body: { error: 'Notification ID is required' } }

    await facteur.db.updateNotification({ id: notificationId, status })

    return { status: 204, body: {} }
  },
}))

/**
 * Mark all notifications for a user as read or seen
 */
export const markAllNotificationsAsRoute = defineRoute(({ facteur, authorize }) => ({
  method: 'post',
  route: '/notifications/notifiable/:notifiableId/mark-all',
  handler: async (request) => {
    const notifiableId = request.params.notifiableId
    const tenantId = request.body.tenantId
    const status = request.body.status

    const isAuthorized = await checkAuthorization({ authorize, request, notifiableId, tenantId })
    if (!isAuthorized) return UNAUTHORIZED_RESPONSE

    if (!status) return { status: 400, body: { error: 'Status is required' } }

    await facteur.db.updateAllNotifications({ notifiableId, tenantId, status })

    return { status: 204, body: {} }
  },
}))
