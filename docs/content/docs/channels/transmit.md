# Transmit Channel

The Transmit channel allows you to send real-time notifications through AdonisJS Transmit, enabling WebSocket-based communication to connected clients. This channel is perfect for real-time updates, live notifications, and instant messaging features. It uses the `@adonisjs/transmit` package.

## Batching

This channel does **not support batching**. Each notification is broadcast individually.

## Configuration

```ts
import { defineConfig } from 'facteur'
import { transmitChannel } from '@facteurjs/adonisjs/channels/transmit'
import transmit from '@adonisjs/transmit/services/main'

export default defineConfig({
  channels: {
    transmit: transmitChannel({
      // Pass your Transmit instance
      transmit: transmit,
    })
  },
})
```

## Configuration Options

- **`transmit`** (required): Your AdonisJS Transmit instance

## Targets

The Transmit channel requires a channel name to broadcast to:

```ts
await facteur
  .notification(MyNotification)
  .via({
    transmit: {
      // Channel name to broadcast to (required)
      channel: 'user-123'
    }
  })
  .send()
```

### Target Properties

- **`channel`** (required): The channel name to broadcast the notification to

## Message Features

When creating notifications for Transmit, the message content is broadcast directly:

```ts
export default class TransmitNotification extends Notification {
  asTransmitMessage() {
    return TransmitMessage.create()
      .setContent({
        type: 'notification',
        title: 'New Message',
        body: 'You have received a new message',
        data: {
          userId: 123,
          timestamp: Date.now(),
          priority: 'high'
        }
      })
  }
}
```

## Client-Side Integration

On the client side, you can listen for notifications using Transmit:

```ts
// Subscribe to a channel
transmit.subscribe('user-123')

// Listen for notifications
transmit.on('user-123', (data) => {
  console.log('Received notification:', data)
  // Handle the notification (show toast, update UI, etc.)
})
```
