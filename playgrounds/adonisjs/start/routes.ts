/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import User from '#models/user'
import router from '@adonisjs/core/services/router'
import facteur from '../facteur/service.js'
import InvoicePaidNotification from '../app/notifications/invoice_paid_notification.js'
import PostLikedNotification from '../app/notifications/post_liked_notification.js'
import transmit from '@adonisjs/transmit/services/main'

router.on('/').renderInertia('home')

router.post('/send', async ({ request, response }) => {
  const notificationIdentifier = request.body().identifier

  const user = await User.firstOrFail()

  const notificationMap: Record<string, any> = {
    InvoicePaidNotification: InvoicePaidNotification,
    PostLikedNotification: PostLikedNotification,
  }

  const NotificationClass = notificationMap[notificationIdentifier]
  if (!NotificationClass) {
    return response.badRequest({ error: 'Invalid notification identifier' })
  }

  await facteur.send({
    notification: NotificationClass,
    notifiable: user,
  })

  return response.ok({ message: 'Notification sent successfully' })
})

transmit.registerRoutes()
facteur.registerRoutes()
