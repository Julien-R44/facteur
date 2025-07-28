# FacteurJS

Facteur is a notification library for Node.js that makes sending notifications across different channels simple and efficient. It's framework-agnostic, so you can use it with any Node.js application. Out of the box, it supports in-app notifications, web push, email, SMS, and chat platforms like Slack, Discord, and Teams.

Whether you need something basic or complex, Facteur has you covered:
- Want to send a quick Slack notification when someone signs up?
- Need to send notifications through different channels based on user preferences?
- Building complex notification flows with conditions, delays, and retries?
- Want that classic real-time notification bubble in your web app, with read/unread status?

**Facteur handles all of this**. From simple one-off notifications to sophisticated multi-channel workflows.

Here's what you get out of the box:
- 📱 Multiple notification channels: web push, email, SMS, and chat platforms
- 🔌 Tons of supported providers (and you can build custom ones too)
- ⚡ Real-time notifications via Server-Sent Events or WebSockets
- ⚙️ Automatic user preference management
- 🛣️ Auto-generated API routes for your app
- 🎨 Frontend SDK for easy integration
- 🎯 Unified API for creating messages
- 🏢 Multi-tenancy support

::include{template="partials/supported_providers"}

## Features

Let's dive into what makes Facteur useful:

### Sending Notifications

Sending notifications with Facteur is straightforward:

```ts
export class UserRegisteredNotification extends Notification<User> {
  static options = {
    name: 'User Registered',
    category: 'business',
    deliverBy: {
      slack: true,
      email: true,
    }
  }

  asSlackMessage({ notifiable }) {
    return SlackMessage.create()
      .setText(`A new user has registered: ${notifiable.name}`)
      .setChannel('#general');
  }

  asEmailMessage({ notifiable }) {
    return EmailMessage.create()
      .setSubject('New User Registration')
      .setBody(`A new user has registered: ${notifiable.name}`)
  }
}
```

```ts
import facteur from './facteur.js'

await facteur.send({
  notification: UserRegisteredNotification,
  notifiable: user,
})
```

That's it. This notification gets sent through all the channels you specified in `deliverBy` (Slack and Email in this case).

### In-App Notifications

We just saw how to send notifications to external services. Now let's look at in-app notifications, think Twitter or Facebook notifications that appear in real-time and get stored in your database with read/unread status.

Facteur handles this elegantly too.

You can combine the `database` channel with the `transmit` channel (SSE) to send real-time notifications to your app while storing them in the database:

```ts
export class UserMentionedNotification extends Notification<User> {
  static options = {
    name: 'User Mentioned',
    category: 'social',
    deliverBy: {
      database: true,
      transmit: true,
    }
  }

  asDatabaseMessage({ notifiable }) {
    return DatabaseMessage.create()
      .setTitle(`You were mentioned by ${notifiable.name}`)
      .setBody(`Check out the post where you were mentioned!`)
      .setData({ postId: '12345' });
  }

  asTransmitMessage({ notifiable }) {
    return TransmitMessage.create().setData({ type: 'user_mentioned' });
  }
}
```

Send it the same way:

```ts
import facteur from './facteur.js'

await facteur.send({
  notification: UserMentionedNotification,
  notifiable: user,
})
```

After sending, the notification gets saved to your database and delivered in real-time via Server-Sent Events or WebSockets. Users can see it in your app and mark it as read.

### User Preferences

Facteur automatically handles user notification preferences. Users can choose which channels they want to receive notifications through, and Facteur respects those choices.

For example, if a user wants email and Slack notifications but not SMS, Facteur will only send through their preferred channels.

### Automatic API Routes

Facteur comes with ready-to-use API routes for managing user preferences, listing notifications, marking them as read, and more.

This means you can build your frontend faster without worrying about the backend plumbing.

### Frontend SDK

To make frontend integration even easier, Facteur provides a type-safe frontend SDK that works with your API (which exposes Facteur's automatic routes). Just install the SDK and start making API calls:

```ts
import facteur from '@facteurjs/sdk'

const notifications = await facteur.notifications.list({
  userId: '123',
  tenantId: '456'
})

await facteur.notifications.markAsRead({ notificationId: '789' })
await facteur.preferences.update({
  userId: '123',
  preferences: { email: true, slack: false, sms: true }
})
```

There's plenty more to explore, we'll cover it all in the following sections.

## What's Coming

Facteur is actively being developed. Here's what's on the roadmap:
- Notification queuing support
- Debouncing and batching system
- Diagnostic channels for tracing and monitoring
- Topics. 
- Headless React/Vue components for even easier integration (TanStack Query hooks? Headless UI components? Shadcn registry ?)
- Even more notification channels !

If you're interested in a specific feature, feel free to open an issue on GitHub or contribute to the project.

Our goal is to make Facteur the go-to notification solution for the Node.js ecosystem, a central hub for every notification channel you can think of. We need your help to make that happen!

## Sponsor

If you like this project, please [consider supporting it by sponsoring it](https://github.com/sponsors/Julien-R44/). It helps a lot with maintenance and improvements. Thanks!
