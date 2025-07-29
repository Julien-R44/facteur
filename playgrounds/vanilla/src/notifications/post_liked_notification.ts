import { DiscordMessage } from '@facteurjs/core/channels/discord'
import { Notification, type NotificationOptions } from '@facteurjs/core/types'

import type { User } from '../types.js'
import { SocketIoMessage } from '@facteurjs/core/channels/socketio'
import { AwsSnsMessage } from '@facteurjs/core/channels/aws-sns'

export class AnonymousLikeNotification extends Notification<undefined, {}> {
  static override options: NotificationOptions = {
    name: 'Anonymous Notification',
    deliverBy: { discord: true },
  }

  asDiscordMessage(): DiscordMessage {
    return DiscordMessage.create().setBody(`Someone did something!`).setBotUsername('Facteur Bot')
  }
}

export class PostLikedNotification extends Notification<User, { amount: number }> {
  static override options: NotificationOptions = {
    name: 'Post Liked',
    deliverBy: { discord: true, socketio: true, awsSns: true },
  }

  asDiscordMessage(): DiscordMessage {
    return DiscordMessage.create()
      .setBody(`Your post has been liked!`)
      .setBotUsername('Facteur Bot')
  }

  asSocketioMessage(): SocketIoMessage {
    return SocketIoMessage.create().setData({
      message: `Your post has been liked!`,
      userId: this.notifiable?.id,
      timestamp: new Date().toISOString(),
    })
  }

  asAwssnsMessage(): AwsSnsMessage {
    return AwsSnsMessage.create().setMessage('Your post has been liked!')
  }
}
