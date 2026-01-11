# Web Push Channel

The Web Push channel allows you to send push notifications to web browsers using the Web Push protocol. This channel uses the `web-push` library with VAPID (Voluntary Application Server Identification) authentication.

## Batching

This channel does **not support batching**. Each notification is sent individually.

## Configuration

```ts
import { defineConfig } from 'facteur'
import { webpushChannel } from '@facteurjs/adonisjs/channels/webpush'

export default defineConfig({
  channels: {
    webpush: webpushChannel({
      // Required: VAPID configuration
      vapidSubject: 'mailto:admin@example.com', // or https://example.com
      vapidPublicKey: 'your-vapid-public-key',
      vapidPrivateKey: 'your-vapid-private-key',

      // Optional: GCM API Key (for legacy Chrome support)
      gcmApiKey: 'your-gcm-api-key',

      // Optional: Default TTL in seconds (default: 4 weeks)
      ttl: 86400,

      // Optional: Default urgency level
      urgency: 'normal',

      // Optional: HTTP proxy configuration
      proxy: 'http://proxy:8080',

      // Optional: Request timeout in milliseconds
      timeout: 30000,
    })
  },
})
```

## Configuration Options

- **`vapidSubject`** (required): Contact information (mailto: or https:// URL) for push service operators
- **`vapidPublicKey`** (required): VAPID public key (URL-safe Base64 encoded)
- **`vapidPrivateKey`** (required): VAPID private key (URL-safe Base64 encoded)
- **`gcmApiKey`** (optional): GCM API key for legacy Chrome support
- **`ttl`** (optional): Time-to-live in seconds (how long the push service should retry delivery)
- **`urgency`** (optional): Message urgency level (`'very-low'`, `'low'`, `'normal'`, `'high'`)
- **`proxy`** (optional): HTTP proxy URL for outgoing requests
- **`timeout`** (optional): Request timeout in milliseconds

### Generating VAPID Keys

You can generate VAPID keys using the `web-push` CLI:

```bash
npx web-push generate-vapid-keys
```

## Targets

The Web Push channel requires a push subscription object obtained from the browser:

```ts
await facteur
  .notification(MyNotification)
  .via({
    webpush: {
      subscription: {
        endpoint: 'https://fcm.googleapis.com/fcm/send/...',
        keys: {
          p256dh: 'user-public-key',
          auth: 'user-auth-secret'
        },
        expirationTime: null
      }
    }
  })
  .send()
```

### Target Properties

- **`subscription`** (required): The push subscription object from the browser's Push API
  - **`endpoint`**: The push service URL
  - **`keys.p256dh`**: The user's public key
  - **`keys.auth`**: The authentication secret
  - **`expirationTime`**: Optional expiration timestamp

## Client-Side Setup

To get a push subscription from the browser:

```ts
// Register service worker
const registration = await navigator.serviceWorker.register('/sw.js')

// Request push subscription
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
})

// Send subscription to your server
await fetch('/api/push-subscription', {
  method: 'POST',
  body: JSON.stringify(subscription)
})
```

## Message Features

When creating notifications for Web Push, you can use rich notification features:

```ts
export default class WebpushNotification extends Notification {
  asWebpushMessage() {
    return WebpushMessage.create()
      .setTitle('Notification Title')
      .setBody('This is the notification body')
      .setIcon('/icons/notification-icon.png')
      .setImage('/images/large-image.png')
      .setBadge('/icons/badge.png')
      .setTag('unique-tag')
      .setUrl('/page-to-open')
      .setData({ customData: 'value' })
      .setActions([
        { action: 'view', title: 'View', icon: '/icons/view.png' },
        { action: 'dismiss', title: 'Dismiss' }
      ])
      .setRequireInteraction(true)
      .setSilent(false)
      .setRenotify(true)
      .setVibrate([200, 100, 200])
  }
}
```

### Available Methods

- **`setTitle(title)`**: Set the notification title
- **`setBody(body)`**: Set the notification body text
- **`setIcon(url)`**: Set the notification icon URL
- **`setImage(url)`**: Set a large image URL
- **`setBadge(url)`**: Set the badge icon URL
- **`setTag(tag)`**: Set a tag to group/replace notifications
- **`setData(data)`**: Set custom data payload
- **`setUrl(url)`**: Set the URL to open when clicked
- **`setActions(actions)`**: Set notification action buttons
- **`addAction(action)`**: Add a single action button
- **`setRequireInteraction(bool)`**: Keep notification visible until user interacts
- **`setSilent(bool)`**: Suppress sound/vibration
- **`setRenotify(bool)`**: Vibrate/sound when replacing a notification with same tag
- **`setTimestamp(timestamp)`**: Set a custom timestamp
- **`setVibrate(pattern)`**: Set vibration pattern (array of milliseconds)
- **`setDir(dir)`**: Set text direction (`'auto'`, `'ltr'`, `'rtl'`)
- **`setLang(lang)`**: Set notification language
