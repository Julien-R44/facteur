# Expo Notifications Channel

The Expo channel allows you to send push notifications to mobile devices through Expo's push notification service. This channel is perfect for React Native applications built with Expo.

## Configuration

```ts
import { defineConfig } from 'facteur'
import { expoChannel } from '@facteurjs/adonisjs/channels/expo'

export default defineConfig({
  channels: {
    expo: expoChannel({
      // Optional: Access token for additional features
      accessToken: 'your-expo-access-token',

      // Optional: Custom API URL (defaults to Expo's service)
      apiUrl: 'https://exp.host/--/api/v2/push/send',

      // Optional: Use FCM for Android (recommended)
      useFcmV1: true,
    })
  },
})
```

## Configuration Options

- **`accessToken`** (optional): Your Expo access token for additional features and higher rate limits
- **`apiUrl`** (optional): Custom Expo push API URL (defaults to Expo's official service)
- **`useFcmV1`** (optional): Use FCM v1 API for Android notifications (recommended)

All configuration options are optional. The channel works out of the box without any configuration.

## Targets

The Expo channel requires an Expo push token for the target device:

```ts
await facteur
  .notification(MyNotification)
  .via({
    expo: {
      // Expo push token (required)
      expoToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]'
    }
  })
  .send()
```

### Target Properties

- **`expoToken`** (required): A valid Expo push token obtained from the client device

## Expo Push Token Format

Expo push tokens have a specific format and are validated automatically:

- Format: `ExponentPushToken[...]` or `ExpoPushToken[...]`
- The channel validates tokens before sending notifications
- Invalid tokens will throw an error immediately

## Message Features

When creating notifications for Expo, you can use rich push notification features:

```ts
export default class ExpoNotification extends Notification {
  asExpoMessage() {
    return ExpoMessage.create()
      .setTitle('Notification Title')
      .setBody('This is the notification body')
      .setData({ customData: 'value' })
      .setSound('default')
      .setBadge(1)
      .setPriority('high')
      .setChannelId('default')
  }
}
```
