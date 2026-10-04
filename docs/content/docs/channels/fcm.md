# Firebase Cloud Messaging Channel

The FCM channel allows you to send push notifications to mobile devices and web browsers through Firebase Cloud Messaging. This channel uses the Firebase Admin SDK (`firebase-admin`).

## Batching

This channel **supports batching** with a maximum of **500 messages** per batch. Opt in with `.to(users).useDriverBatching().send()`; normal bulk sends call the channel individually.

## Configuration

```ts
import { createFacteur } from '@facteurjs/core'
import { fcmChannel } from '@facteurjs/core/channels/fcm'

export const facteur = createFacteur({
  discoverer: { searchDirectory: new URL('./notifications/', import.meta.url) },
  channels: {
    fcm: fcmChannel({
      // Path to your service account key file
      serviceAccountKeyPath: './firebase-service-account.json',

      // Debug mode - redirect all messages to this token
      debugToken: 'your-debug-device-token',
    }),
  },
})
```

## Configuration Options

- **`serviceAccountKeyPath`** (optional): Path to your Firebase service account JSON key file
- **`projectId`** (optional): Your Firebase project ID (if not using service account file)
- **`credential`** (optional): Firebase credential object (if not using service account file)
- **`debugToken`** (optional): In debug mode, redirect all messages to this device token

Alternatively, pass Firebase `AppOptions`, for example `{ projectId, credential: cert(serviceAccount) }` with `cert` imported from `firebase-admin/app`, or use Firebase's application-default credentials. The channel forwards these options to `initializeApp()`.

## Targets

The FCM channel supports three targeting methods:

```ts
// Target a specific device token
await facteur
  .notification(MyNotification)
  .via({
    fcm: {
      token: 'device-registration-token',
    },
  })
  .send()

// Target a topic
await facteur
  .notification(MyNotification)
  .via({
    fcm: {
      topic: 'news',
    },
  })
  .send()

// Target with a condition (multiple topics)
await facteur
  .notification(MyNotification)
  .via({
    fcm: {
      condition: "'news' in topics || 'weather' in topics",
    },
  })
  .send()
```

### Target Properties

- **`token`** (optional): Device registration token for a specific device
- **`topic`** (optional): Topic name to send to all subscribed devices
- **`condition`** (optional): Condition expression for targeting multiple topics

You must provide exactly one of these properties.

## Message Features

When creating notifications for FCM, you can use rich notification features:

```ts
import { Notification } from '@facteurjs/core/types'
import { FcmMessage } from '@facteurjs/core/channels/fcm'

export default class FcmNotification extends Notification<undefined> {
  asFcmMessage() {
    return (
      FcmMessage.create()
        .setTitle('Notification Title')
        .setBody('This is the notification body')
        .setImage('https://example.com/image.png')
        .setData({ orderId: '12345', type: 'order-update' })
        // Platform-specific configurations
        .setAndroid({
          priority: 'high',
          notification: {
            channelId: 'high-priority',
            sound: 'default',
          },
        })
        .setApns({
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        })
        .setWebpush({
          notification: {
            icon: 'https://example.com/icon.png',
          },
        })
    )
  }
}
```

### Available Methods

- **`setTitle(title)`**: Set the notification title
- **`setBody(body)`**: Set the notification body text
- **`setImage(url)`**: Set the notification image URL
- **`setData(data)`**: Set custom data payload (key-value pairs, values must be strings)
- **`addData(key, value)`**: Add a single data key-value pair
- **`setNotification(notification)`**: Set the full notification object
- **`setAndroid(config)`**: Set Android-specific configuration
- **`setApns(config)`**: Set Apple Push Notification service configuration
- **`setWebpush(config)`**: Set Web Push configuration
- **`setToken(token)`**: Set the target device token (can also be set via targets)
- **`setTopic(topic)`**: Set the target topic (can also be set via targets)
- **`setCondition(condition)`**: Set the target condition (can also be set via targets)
