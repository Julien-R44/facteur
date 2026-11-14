# Socket.IO Channel

The Socket.IO channel allows you to send real-time notifications through Socket.IO, enabling WebSocket-based communication to connected clients. This channel uses the `socket.io` library.

## Batching

This channel does **not support batching**. Each notification is emitted individually.

## Configuration

```ts
import { createFacteur } from '@facteurjs/core'
import { socketIoChannel } from '@facteurjs/core/channels/socketio'
import { Server } from 'socket.io'

const io = new Server(httpServer)

export const facteur = createFacteur({
  discoverer: { searchDirectory: new URL('./notifications/', import.meta.url) },
  channels: {
    socketIo: socketIoChannel({
      // Pass your Socket.IO server instance
      // Or pass the instance directly: server: io
      server: () => io,
    }),
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
      namespace: '/admin',
    },
  })
  .send()
```

### Target Properties

- **`event`** (required): The event name to emit
- **`namespace`** (optional): The Socket.IO namespace to emit to (defaults to `/`)

## Message Features

When creating notifications for Socket.IO, you set the data payload:

```ts
import { Notification } from '@facteurjs/core/types'
import { SocketIoMessage } from '@facteurjs/core/channels/socketio'

export default class SocketIONotification extends Notification<
  undefined,
  { orderId: number; status: string }
> {
  asSocketIoMessage() {
    return SocketIoMessage.create().setData({
      type: 'order-update',
      orderId: this.params.orderId,
      status: this.params.status,
      timestamp: Date.now(),
    })
  }
}
```

For this anonymous notification, send with `.via({ socketIo: { event: 'notification' } }).params({ orderId: 123, status: 'shipped' }).send()`.

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

The built-in channel emits to **all clients** in the specified namespace; it has no room or socket target. Joining a room does not narrow its broadcast. Use an authorized user-specific namespace or a [custom channel](../deep/custom-channels.md) that calls `.to(room)` for private delivery. Authenticate connections and verify namespace/room access on your server; never trust a client-supplied user ID alone.
