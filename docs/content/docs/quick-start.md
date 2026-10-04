# Quick setup

Facteur requires Node.js 24 or later. Install FacteurJS and the optional provider SDKs used in this example:

:::codegroup

```sh
// title: npm
npm i @facteurjs/core twilio web-push
```

```sh
// title: pnpm
pnpm add @facteurjs/core twilio web-push
```

```sh
// title: yarn
yarn add @facteurjs/core twilio web-push
```

:::

## Configuration

Once installed, you can setup FacteurJS in your application as follows:

```ts
import { createFacteur } from '@facteurjs/core'
import type { InferChannelsFromConfig } from '@facteurjs/core/types'
import { webpushChannel } from '@facteurjs/core/channels/webpush'
import { twilioChannel } from '@facteurjs/core/channels/twilio'

export const facteur = createFacteur({
  discoverer: {
    // Discover default exports in files named *_notification.ts or *_notification.js.
    searchDirectory: new URL('./src', import.meta.url),
  },

  channels: {
    // Define your different delivery channels here.
    // For example, SMS using Twilio.
    twilio: twilioChannel({
      accountSid: process.env.TWILIO_ACCOUNT_SID!,
      authToken: process.env.TWILIO_AUTH_TOKEN!,
      from: process.env.TWILIO_FROM!,
    }),

    // And a webpush channel:
    webpush: webpushChannel({
      vapidSubject: process.env.WEBPUSH_VAPID_SUBJECT!,
      vapidPublicKey: process.env.WEBPUSH_VAPID_PUBLIC_KEY!,
      vapidPrivateKey: process.env.WEBPUSH_VAPID_PRIVATE_KEY!,
    }),
  },
})

declare module '@facteurjs/core/types' {
  interface NotificationChannels extends InferChannelsFromConfig<typeof facteur> {}
}

await facteur.discoverer.discoverNotifications()
```

## Creating your first notification

Now that you have FacteurJS configured, you can create your first notification class. The role of a notification class is to define the content of the notification on the different channels.

```ts
import { Notification, type NotificationOptions } from '@facteurjs/core/types'
import { TwilioMessage } from '@facteurjs/core/channels/twilio'
import { WebpushMessage } from '@facteurjs/core/channels/webpush'
import type { User } from './user.js'

interface InvoicePaidParams {
  amount: number
}

export default class InvoicePaidNotification extends Notification<User, InvoicePaidParams> {
  static options: NotificationOptions<User> = {
    name: 'Invoice Paid',
    category: 'billing',
    deliverBy: {
      twilio: true,
      webpush: true,
    },
  }

  asTwilioMessage() {
    return TwilioMessage.create().setBody(`Your invoice of $${this.params.amount} has been paid!`)
  }

  asWebpushMessage() {
    return WebpushMessage.create()
      .setTitle('Invoice Paid')
      .setBody(`Your invoice of $${this.params.amount} has been paid!`)
      .setIcon('https://example.com/icon.png')
      .setActions([
        { action: 'view', title: 'View Invoice' },
        { action: 'pay', title: 'Pay Now' },
      ])
  }
}
```

When creating a notification class, you need to extend the `Notification` class from FacteurJS. The `Notification` class requires two type parameters:

- the notifiable entity (in this case, `User`). It represents the entity that will receive the notification.
- and the parameters required for sending the notification (in this case, `InvoicePaidParams`). You will be able to re-use these parameters when formatting the notification for each channel.

Then as you can see, Facteur provides clean and chainable Message APIs for each channel that will help you format the notification easily.

## Define notification targets

Now that you have your notification class, we will need to define the TARGETS for the notification. the "targets" are some properties, required by the channels, that will represent the destination of the notification. For example, for an Email channel, the target will be the email address of the user. For a SMS channel, it will be the phone number of the user, etc.

For that, our Notifiable entity (the `User` in this case) needs to implement the `notificationTargets` method, which will return an object containing the targets for each channel.

```ts
import type { Notifiable, NotifiableTargets } from '@facteurjs/core/types'
import type { WebpushTargets } from '@facteurjs/core/channels/webpush/types'

export class User implements Notifiable {
  constructor(
    public phoneNumber: string,
    public webpushSubscription: WebpushTargets['subscription'],
  ) {}

  notificationTargets(): NotifiableTargets {
    return {
      twilio: { to: this.phoneNumber },
      webpush: { subscription: this.webpushSubscription },
    }
  }
}
```

Save the model as `src/user.ts` and the notification as `src/invoice_paid_notification.ts`. The configuration example belongs in `facteur.ts` at the project root.

As you can see our `notificationTargets` method returns an object where the keys are the channel names and the values are the targets for each channel.

Now that this is done, Facteur will be able to automatically route the notification to the correct channel targets based on this method. No need to manually specify the targets when sending the notification.

## Sending the notification

To send the notification, will be as simple as:

```ts
import { facteur } from './facteur.js'
import InvoicePaidNotification from './src/invoice_paid_notification.js'

// Retrieve a recipient from your application (with notificationTargets()).
const user = await findUser(1)

await facteur.notification(InvoicePaidNotification).to(user).params({ amount: 100 }).send()
```

All good. Your user just received a SMS and a WebPush notification saying that their invoice has been paid!

## Next steps

Now that you have a basic understanding of how to create and send notifications with FacteurJS, you can explore more advanced features like :

- [Configuration](./configuration.md)
- [Creating notifications](./notifications.md)
- [AdonisJS integration](./integrations/adonisjs.md)
- [In-app notifications](./in-app-notifications.md)
- [Custom channels](./deep/custom-channels.md)
- [Frontend SDK](./sdks/frontend-sdk.md)
