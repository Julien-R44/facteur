import User from '#models/user'
import { Notification, NotificationOptions } from '@facteurjs/adonisjs/types'
import { DatabaseMessage } from '@facteurjs/adonisjs/channels/database'
import { DiscordMessage } from '@facteurjs/adonisjs/channels/discord'
import { TransmitMessage } from '@facteurjs/adonisjs/channels/transmit'
import { TwilioMessage } from '@facteurjs/adonisjs/channels/twilio'

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
      twilio: true,
    },
  }

  asTransmitMessage(): TransmitMessage {
    return TransmitMessage.create().setContent({
      title: 'Invoice Paid',
      body: 'Your invoice has been successfully paid.',
      timestamp: new Date().toISOString(),
    })
  }

  asTwilioMessage(): TwilioMessage {
    return TwilioMessage.create().setBody('Post liked on localhost:3333')
  }

  asDatabaseMessage(): DatabaseMessage {
    return DatabaseMessage.create()
      .setContent('Post liked !')
      .setType('post_liked')
      .setTenantId(Math.floor(Math.random() * 2 + 1))
  }

  asDiscordMessage() {
    return DiscordMessage.create().setBotUsername('Test').setBody('Post liked !')
  }
}
