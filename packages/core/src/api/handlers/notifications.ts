import { defineRoute } from '../index.js'

/**
 * Get all notifications for a given user
 */
export const getNotificationRoute = defineRoute(({ facteur }) => ({
  method: 'get',
  route: '/notifications/notifiable/:id/notifications',
  handler: async (request) => {
    const userId = request.params.id

    const notifications = await facteur.db.getNotifications({
      notifiableId: userId,
      tenantId: request.query.tenantId,
      page: request.query.page,
      limit: request.query.limit,
      status: request.query.status,
    })

    return { status: 200, body: notifications || [] }
  },
}))

/**
 * Mark a specific notification as read or seen
 */
export const markNotificationAsRoute = defineRoute(({ facteur }) => ({
  method: 'post',
  route: '/notifications/notifiable/:id/mark-as',
  handler: async (request) => {
    const notificationId = request.body.notificationId
    const status = request.body.status

    if (!status) return { status: 400, body: { error: 'Status is required' } }
    if (!notificationId) return { status: 400, body: { error: 'Notification ID is required' } }

    await facteur.db.updateNotification({ id: notificationId, status })

    return { status: 204, body: {} }
  },
}))

/**
 * Mark all notifications for a user as read or seen
 */
export const markAllNotificationsAsRoute = defineRoute(({ facteur }) => ({
  method: 'post',
  route: '/notifications/notifiable/:id/mark-all',
  handler: async (request) => {
    const status = request.body.status
    if (!status) return { status: 400, body: { error: 'Status is required' } }

    await facteur.db.updateAllNotifications({
      notifiableId: request.params.id,
      tenantId: request.body.tenantId,
      status,
    })

    return { status: 204, body: {} }
  },
}))
