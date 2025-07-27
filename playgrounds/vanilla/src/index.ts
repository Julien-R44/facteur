import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { facteur } from './lib/facteur.js'
import {
  AnonymousLikeNotification,
  PostLikedNotification,
} from './notifications/post_liked_notification.js'
import { User } from './types.js'

const randomUser: User = {
  id: '123',
  name: 'John Doe',
  email: 'foo@ok.com',
  createdAt: new Date(),
  updatedAt: new Date(),
  notificationTargets: () => ({
    discord: { default: true },
  }),
}

const app = new Hono()
app.get('/send', async (c) => {
  await facteur.send({
    notification: AnonymousLikeNotification,
    via: { discord: { default: true } },
    params: {},
  })

  return c.text('Hello, this is a test notification!')
})

app.get('/send-post-liked', async (c) => {
  await facteur.send({
    notification: PostLikedNotification,
    notifiable: randomUser,
    via: { discord: { default: true } },
    params: { amount: 1 },
  })

  return c.text('Post liked notification sent!')
})

serve({
  fetch: app.fetch,
  port: 3000,
})

console.log('Server is running on http://localhost:3000')
