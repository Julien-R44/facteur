# Twilio SMS Channel

The Twilio channel allows you to send SMS notifications via the Twilio service. This channel supports regular phone numbers, Twilio messaging services, and alphanumeric senders. It uses the Twilio Programmable SMS API.

## Batching

This channel does **not support batching**. Each SMS is sent individually.

## Configuration

```ts
import { createFacteur } from '@facteurjs/core'
import { twilioChannel } from '@facteurjs/core/channels/twilio'

export const facteur = createFacteur({
  discoverer: { searchDirectory: new URL('./notifications/', import.meta.url) },
  channels: {
    twilio: twilioChannel({
      // Required configuration
      accountSid: 'your-twilio-account-sid',
      authToken: 'your-twilio-auth-token',

      // Default phone number to send messages from
      from: '+1234567890',

      // Twilio messaging service SID (recommended by Twilio)
      messagingServiceSid: 'your-messaging-service-sid',

      // Alphanumeric sender (for supported regions)
      alphanumericSender: 'YourApp',

      // Maximum price per message in USD
      maxPrice: 0.05,

      // Debug mode - redirect all messages to this number
      debugTo: '+1234567890',

      // Enable URL shortening
      shortenUrls: true,

      // Twilio error codes to ignore
      ignoredErrorCodes: [21614, '*'],
    }),
  },
})
```

## Configuration Options

- **`accountSid`** (required): Your Twilio account SID
- **`authToken`** (required): Your Twilio authentication token
- **`from`** (optional): Default phone number to send messages from
- **`messagingServiceSid`** (optional): Twilio messaging service SID (recommended)
- **`alphanumericSender`** (optional): Alphanumeric sender for supported regions
- **`maxPrice`** (optional): Maximum price per message in USD
- **`debugTo`** (optional): In debug mode, redirect all messages to this number
- **`shortenUrls`** (optional): Enable automatic URL shortening
- **`ignoredErrorCodes`** (optional): List of Twilio error codes to ignore (use `'*'` to ignore all errors)

## Targets

The Twilio channel targets are:

```ts
await facteur
  .notification(MyNotification)
  .via({
    twilio: {
      // Recipient phone number (required)
      to: '+1234567890',

      // Optional: override the sender for this specific message
      from: '+0987654321',
    },
  })
  .send()
```

### Target Properties

- **`to`** (required): The recipient's phone number in international format
- **`from`** (optional): Override the sender for this specific message

## Message Features

```ts
import { Notification } from '@facteurjs/core/types'
import { TwilioMessage } from '@facteurjs/core/channels/twilio'

export default class SmsNotification extends Notification<undefined> {
  asTwilioMessage() {
    return TwilioMessage.create().setBody('Your verification code is: 123456')
  }
}
```

Use `.via({ twilio: { to: '+33612345678' } }).send()` for this anonymous notification. `TwilioMessage` also supports `setFrom()`, `setMessagingServiceSid()`, `setAlphanumericSender()`, `setMaxPrice()`, `setValidityPeriod()`, `setForceDelivery()`, `setProvideFeedback()` and `setApplicationSid()`.

The sender priority is message `from`, target `from`, configured `from`, message alphanumeric sender, then configured alphanumeric sender. Ignored error codes are treated as successful sends; avoid `'*'` when you need delivery failures to be reported.
