# Socket.IO Channel

The Socket.IO channel allows you to send real-time notifications through Socket.IO, enabling WebSocket-based communication to connected clients. This channel uses the `socket.io` library.

## Batching

This channel does **not support batching**. Each notification is emitted individually.

## Configuration

```ts
import { defineConfig } from 'facteur'
import { socketIoChannel } from '@facteurjs/adonisjs/channels/socketio'
import { Server } from 'socket.io'

const io = new Server(httpServer)

export default defineConfig({
  channels: {
    socketIo: socketIoChannel({
      // Pass your Socket.IO server instance
      server: io,

      // Or pass a function that returns the server (for lazy initialization)
      server: () => io,
    })
  },
})
```

## Configuration Options

- **`server`** (required): Your Socket.IO server instance, or a function that returns it

Using a function is useful when the Socket.IO server isn't available at configuration time (e.g., during application bootstrap).

## Targets

The Socket.IO channel requires an event name and optionally a namespace:

```ts
await facteur
  .notification(MyNotification)
  .via({
    socketIo: {
      // Event name to emit (required)
      event: 'notification',

      // Namespace to emit to (optional, defaults to '/')
      namespace: '/admin'
    }
  })
  .send()
```

### Target Properties

- **`event`** (required): The event name to emit
- **`namespace`** (optional): The Socket.IO namespace to emit to (defaults to `/`)

## Message Features

When creating notifications for Socket.IO, you set the data payload:

```ts
export default class SocketIONotification extends Notification {
  asSocketIoMessage() {
    return SocketIoMessage.create()
      .setData({
        type: 'order-update',
        orderId: this.order.id,
        status: this.order.status,
        timestamp: Date.now(),
      })
  }
}
```

### Available Methods

- **`setData(data)`**: Set the data payload to emit with the event

## Client-Side Integration

On the client side, you can listen for notifications using Socket.IO:

```ts
import { io } from 'socket.io-client'

const socket = io('http://localhost:3000')

// Listen for notifications on default namespace
socket.on('notification', (data) => {
  console.log('Received notification:', data)
})

// Or connect to a specific namespace
const adminSocket = io('http://localhost:3000/admin')
adminSocket.on('notification', (data) => {
  console.log('Admin notification:', data)
})
```

## Targeting Specific Clients

The Socket.IO channel emits to all clients in the specified namespace. For targeting specific users, combine with rooms:

```ts
// In your Socket.IO setup
io.on('connection', (socket) => {
  const userId = socket.handshake.auth.userId
  socket.join(`user:${userId}`)
})

// Then in your notification, use a room-specific namespace pattern
// or implement custom targeting logic in a custom channel
```
