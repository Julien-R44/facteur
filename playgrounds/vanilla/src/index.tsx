import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { facteur } from './lib/facteur.js'
import { PostLikedNotification } from './notifications/post_liked_notification.js'
import { User } from './types.js'
import { ioServer } from './lib/socketio.js'
import { serveStatic } from '@hono/node-server/serve-static'
import { createFacteurServer } from '@facteurjs/core/api'
import { HonoServerAdapter } from '@facteurjs/hono'

/**
 * Create a fake random user just for demonstration purposes.
 */
const randomUser: User = {
  id: '123',
  name: 'John Doe',
  email: 'foo@ok.com',
  createdAt: new Date(),
  updatedAt: new Date(),

  /**
   * Notification targets for this current user.
   */
  notificationTargets: () => ({
    discord: { default: true },
    socketIo: { event: 'toast', namespace: 'users/123' },
    awsSns: { to: process.env.TO_SMS! },
  }),
}

const app = new Hono()
app.use('/static/*', serveStatic({ root: '/static/' }))

/**
 * Registering Facteur routes in Hono using the HonoServerAdapter.
 */
createFacteurServer({ adapter: new HonoServerAdapter(app), facteur })

/**
 * Serve the Hono app and attach the Socket.IO server.
 * SocketIO for real-time notifications.
 */
const server = serve({ fetch: app.fetch, port: 3000 })
ioServer.attach(server)
console.log('Server is running on http://localhost:3000')
console.log('WebSocket server is running on ws://localhost:3000/ws')

/**
 * Dumb endpoint that will send a PostLikedNotification to our random user
 */
app.get('/send-post-liked', async (c) => {
  await facteur.send({
    notification: PostLikedNotification,
    to: randomUser,
    params: { amount: 1 },
  })

  return c.text('Post liked notification sent!')
})

app.get('/', (c) => {
  return c.html(
    <html style="background-color: black; color: white;">
      <body>
        <h1>Welcome to the Facteur Playground</h1>
      </body>
    </html>,
  )
})
