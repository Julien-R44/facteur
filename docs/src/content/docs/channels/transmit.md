# Transmit Channel

The Transmit channel broadcasts realtime notifications over **Server-Sent Events (SSE)**, not WebSockets. The core channel accepts a `@boringnode/transmit` instance; the AdonisJS integration resolves `@adonisjs/transmit` for you.

## Batching

This channel does **not support batching**. Each notification is broadcast individually.

## Configuration

```ts
import { defineConfig, channels } from '@facteurjs/adonisjs'

export default defineConfig({
  channels: {
    transmit: channels.transmit(),
  },
})
```

## Configuration Options

`channels.transmit()` resolves the AdonisJS service. For manual core setup, import `transmitChannel` from `@facteurjs/core/channels/transmit` and provide `{ transmit }`. Register the transport's subscription routes and authorization separately from Facteur's notification HTTP API.

## Targets

The Transmit channel requires a channel name to broadcast to:

```ts
await facteur
  .notification(MyNotification)
  .via({
    transmit: {
      // Channel name to broadcast to (required)
      channel: 'user-123',
    },
  })
  .send()
```

### Target Properties

- **`channel`** (required): The channel name to broadcast the notification to

## Message Features

When creating notifications for Transmit, the message content is broadcast directly:

```ts
import { Notification } from '@facteurjs/core/types'
import { TransmitMessage } from '@facteurjs/core/channels/transmit'

export default class TransmitNotification extends Notification<undefined> {
  asTransmitMessage() {
    return TransmitMessage.create().setContent({
      type: 'notification',
      title: 'New Message',
      body: 'You have received a new message',
      data: {
        userId: 123,
        timestamp: Date.now(),
        priority: 'high',
      },
    })
  }
}
```

## Client-Side Integration

On the client side, you can listen for notifications using Transmit:

```ts
import { Transmit } from '@adonisjs/transmit-client'

const transmit = new Transmit({ baseUrl: window.location.origin })
const subscription = transmit.subscription('user-123')
await subscription.create()

subscription.onMessage((data) => {
  console.log('Received notification:', data)
  // Handle the notification (show toast, update UI, etc.)
})
```

Install `@adonisjs/transmit-client` in your frontend and authorize subscriptions on the server. Knowing a channel name does not grant access by itself. The React hooks do not subscribe to Transmit automatically.
