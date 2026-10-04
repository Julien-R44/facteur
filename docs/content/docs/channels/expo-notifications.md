# Expo Notifications Channel

The Expo channel allows you to send push notifications to mobile devices through Expo's push notification service. This channel is perfect for React Native applications built with Expo. It uses the Expo Push Notifications API (`expo-server-sdk`).

## Batching

This channel **supports batching** with a maximum of **100 messages** per batch. When sending to multiple recipients, Facteur will automatically batch your notifications for optimal performance.

## Configuration

```ts
import { defineConfig } from 'facteur'
import { expoChannel } from '@facteurjs/adonisjs/channels/expo'

export default defineConfig({
  channels: {
    expo: expoChannel(),
  },
})
```

## Configuration Options

Facteur accepts the `ExpoClientOptions` exported by your installed `expo-server-sdk` version.
All configuration options are optional. The channel works out of the box without any configuration.

### SDK version compatibility

Facteur supports `expo-server-sdk` 3.15 and later 3.x releases, as well as versions 4, 5, 6, and 7.
Upgrading the SDK is optional; existing installations can keep their current supported version.

- **`useFcmV1`** is only available in SDK versions 3 and 4. Remove it when upgrading to version 5 or later; FCM v1 is always used.
- **`httpAgent`** accepts a Node.js `http.Agent` in SDK versions 3 and 4, and an Undici `Dispatcher` in version 5 or later. Update custom agents when upgrading.
- SDK versions 6 and 7 are ESM-only. Version 7 requires Node.js 22.12 or later.

## Targets

The Expo channel requires an Expo push token for the target device:

```ts
await facteur
  .notification(MyNotification)
  .via({
    expo: {
      // Expo push token (required)
      expoToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    },
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
