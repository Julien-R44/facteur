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
import { InvoicePaidNotification } from '../app/notifications/invoice_paid_notification.js'

router.on('/').renderInertia('home')

router.get('/send', async () => {
  const user = await User.firstOrFail()

  await facteur.send({
    message: new InvoicePaidNotification(),
    notifiable: user,
    via: { discord: { default: true } },
  })
})
