# Quick setup

You can install FacteurJS via your favorite package manager:

:::codegroup
```sh
// title: npm
npm i @facteurjs/core
```

```sh
// title: pnpm
pnpm add @facteurjs/core
```

```sh
// title: yarn
yarn add @facteurjs/core
```
:::

## Configuration

Once installed, you can setup FacteurJS in your application as follows:

```ts
import { createFacteur } from '@facteurjs/core'
import { webpushChannel } from '@facteurjs/core/channels/webpush'
import { twilioChannel } from '@facteurjs/core/channels/twilio'

const facteur = createFacteur({
  discoverer: {
    // Set the your src/ directory where FacteurJS will look for notification classes.
    // Will explain later why this is needed.
    searchDirectory: new URL('./src', import.meta.url),
  }

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
    })
  }
})
```

## Creating your first notification

Now that you have FacteurJS configured, you can create your first notification class. The role of a notification class is to define the content of the notification on the different channels.

```ts
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
    }
  }

  asTwilioMessage() {
    return TwilioMessage.create()
      .setBody(`Your invoice of $${this.params.amount} has been paid!`)
  }

  asWebPushMessage() {
    return WebPushMessage.create()
      .setTitle('Invoice Paid')
      .setBody(`Your invoice of $${this.params.amount} has been paid!`)
      .setIcon('https://example.com/icon.png')
      .setActions([
        { action: 'view', title: 'View Invoice' },
        { action: 'pay', title: 'Pay Now' }
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

export class User implements Notifiable {
  phoneNumber: string
  webpushSubscription: Record<string, any> // WebPush subscription object

  notificationTargets(): NotifiableTargets {
    return {
      twilio: { to: this.phoneNumber },
      webpush:  { subscription: this.webpushSubscription }, 
    }
  }
}
```

As you can see our `notificationTargets` method returns an object where the keys are the channel names and the values are the targets for each channel. 

Now that this is done, Facteur will be able to automatically route the notification to the correct channel targets based on this method. No need to manually specify the targets when sending the notification.

## Sending the notification

To send the notification, will be as simple as:

```ts
import { facteur } from './facteur' // Import your configured facteur instance

const user = await User.find(1)
await facteur.send({
  notification: InvoicePaidNotification,
  params: { amount: 100 },
  notifiable: user,
})
```

All good. Your user just received a SMS and a WebPush notification saying that their invoice has been paid! 

## Next steps

Now that you have a basic understanding of how to create and send notifications with FacteurJS, you can explore more advanced features like : 

- [In-app notifications](./in-app-notifications.md)
- [Scheduling notifications](./scheduling-notifications.md)
- [Using custom channels](./custom-channels.md)
- [Preferences and user settings](./preferences.md)
- [Frontend integration](./frontend-integration.md)

