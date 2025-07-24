import User from '#models/user'
import { MessageCtx, Notification, NotificationOptions } from '@facteurjs/adonisjs/types'
import { DatabaseMessage } from '@facteurjs/adonisjs/channels/database'
import { DiscordMessage } from '@facteurjs/adonisjs/channels/discord'
import { TransmitMessage } from '@facteurjs/adonisjs/channels/transmit'

export default class PostLikedNotification extends Notification<User, { postId: number }> {
  static options: NotificationOptions<User> = {
    name: 'Post Liked',
    tags: ['Social'],
    deliverBy: {
      database: true,
      transmit: true,
      discord: true,
      slack: false,
      mail: false,
    },
  }

  asTransmitMessage(): TransmitMessage {
    return TransmitMessage.create().setContent({
      title: 'Invoice Paid',
      body: 'Your invoice has been successfully paid.',
      timestamp: new Date().toISOString(),
    })
  }

  asDatabaseMessage({ notifiable }: MessageCtx<User>): DatabaseMessage {
    return DatabaseMessage.create()
      .setContent('Post liked !')
      .setType('post_liked')
      .setTenantId(Math.floor(Math.random() * 2 + 1))
  }

  asDiscordMessage() {
    return DiscordMessage.create().setBotUsername('Test').setBody('Post liked !')
  }
}
