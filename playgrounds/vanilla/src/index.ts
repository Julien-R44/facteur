import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { facteur } from './lib/facteur.js'
import {
  AnonymousLikeNotification,
  PostLikedNotification,
} from './notifications/post_liked_notification.js'
import { User } from './types.js'
import { ioServer } from './lib/socketio.js'

const randomUser: User = {
  id: '123',
  name: 'John Doe',
  email: 'foo@ok.com',
  createdAt: new Date(),
  updatedAt: new Date(),
  notificationTargets: () => ({
    discord: { default: true },
    socketIo: { event: 'toast', namespace: 'users/123' },
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
    params: { amount: 1 },
  })

  return c.text('Post liked notification sent!')
})

const server = serve({ fetch: app.fetch, port: 3000 })
ioServer
  .attach(server)
  .on('error', (err) => console.log(err))
  .on('connection', (_socket) => console.log('client connected'))

console.log('Server is running on http://localhost:3000')
console.log('WebSocket server is running on ws://localhost:3000/ws')
