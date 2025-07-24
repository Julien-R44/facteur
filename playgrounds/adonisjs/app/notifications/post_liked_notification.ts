import { Notification } from '@facteurjs/adonisjs/types'
import { TwilioMessage } from '@facteurjs/adonisjs/channels/twilio'
import type { NotificationOptions } from '@facteurjs/adonisjs/types'
import { DiscordMessage } from '@facteurjs/adonisjs/channels/discord'
import { DatabaseMessage } from '@facteurjs/adonisjs/channels/database'
import { TransmitMessage } from '@facteurjs/adonisjs/channels/transmit'

import type User from '#models/user'

export default class PostLikedNotification extends Notification<User, { postId: number }> {
  static options: NotificationOptions<User> = {
    name: 'Post Liked',
    tags: ['Social'],
    deliverBy: {
      database: true,
      transmit: true,
      discord: false,
      slack: false,
      mail: false,
      twilio: false,
    },
  }

  asTransmitMessage(): TransmitMessage {
    return TransmitMessage.create().setContent({
      title: 'Post Liked',
      body: 'Your post has been liked.',
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
