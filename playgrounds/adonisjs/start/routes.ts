import transmit from '@adonisjs/transmit/services/main'
import router from '@adonisjs/core/services/router'
import User from '#models/user'

import facteur from '../facteur/service.js'
import PostLikedNotification from '../app/notifications/post_liked_notification.js'
import InvoicePaidNotification from '../app/notifications/invoice_paid_notification.js'
import WelcomeNotification from '../app/notifications/welcome_notification.js'

router.on('/').renderInertia('home', {})

router.post('/send', async ({ request, response }) => {
  const { identifier: notificationIdentifier, tenantId } = request.body()

  const user = await User.firstOrFail()

  const notificationMap: Record<string, any> = {
    InvoicePaidNotification,
    PostLikedNotification,
    WelcomeNotification,
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

/**
 * Queue a notification for background processing.
 * The WelcomeNotification has queue: true, so .send() will queue it automatically.
 * You can also use .queue() explicitly on any notification.
 */
router.post('/queue', async ({ request, response }) => {
  const { name = 'Guest' } = request.body()

  const user = await User.firstOrFail()

  // Option 1: The notification has queue: true, so .send() queues automatically
  await facteur.notification(WelcomeNotification).to(user).params({ name }).send()

  // Option 2: Explicit queue with options (delay, queue name)
  // await facteur.notification(PostLikedNotification).to(user).params({ postId: 123 }).queue({ delay: '5s' })

  return response.ok({
    message: 'Notification queued successfully',
    info: 'Run "node ace queue:work notifications" in another terminal to process the job',
  })
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
