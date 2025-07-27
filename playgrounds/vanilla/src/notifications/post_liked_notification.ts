import { DiscordMessage } from '@facteurjs/core/channels/discord'
import { Notification, type MessageCtx, type NotificationOptions } from '@facteurjs/core/types'

import type { User } from '../types.js'

export class AnonymousLikeNotification extends Notification<undefined, {}> {
  static override options: NotificationOptions = {
    name: 'Anonymous Notification',
    deliverBy: { discord: true },
  }

  asDiscordMessage(_: MessageCtx<undefined, {}>): DiscordMessage {
    return DiscordMessage.create().setBody(`Someone did something!`).setBotUsername('Facteur Bot')
  }
}

export class PostLikedNotification extends Notification<User, { amount: number }> {
  static override options: NotificationOptions = {
    name: 'Post Liked',
    deliverBy: { discord: true },
  }

  override asDiscordMessage(_: MessageCtx<User>): DiscordMessage {
    return DiscordMessage.create()
      .setBody(`Your post has been liked!`)
      .setBotUsername('Facteur Bot')
  }
}
