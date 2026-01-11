import transmit from '@adonisjs/transmit/services/main'
import router from '@adonisjs/core/services/router'
import User from '#models/user'

import facteur from '../facteur/service.js'
import PostLikedNotification from '../app/notifications/post_liked_notification.js'
import InvoicePaidNotification from '../app/notifications/invoice_paid_notification.js'

router.on('/').renderInertia('home', {})

router.post('/send', async ({ request, response }) => {
  const { identifier: notificationIdentifier, tenantId } = request.body()

  const user = await User.firstOrFail()

  const notificationMap: Record<string, any> = {
    InvoicePaidNotification,
    PostLikedNotification,
  }

  const NotificationClass = notificationMap[notificationIdentifier]
  if (!NotificationClass) {
    return response.badRequest({ error: 'Invalid notification identifier' })
  }

  await facteur
    .notification(NotificationClass)
    .params({ amount: 100 })
    .to(user)
    .tenant(tenantId)
    .send()

  return response.ok({ message: 'Notification sent successfully' })
})

transmit.registerRoutes()

router.group(() =>
  facteur.registerRoutes({
    authorize: async (ctx) => {
      return true
    },
  }),
)
// .use(async ({ params, response, auth }, next) => {
//   if (params.notifiableId != auth.user?.id) return response.forbidden({ error: 'Forbidden' })

//   return await next()
// })
