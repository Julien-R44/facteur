import type { NotificationOptions } from '@facteurjs/adonisjs/types'
import type User from '#models/user'

import { Notification } from '@facteurjs/adonisjs/types'
import { TransmitMessage } from '@facteurjs/adonisjs/channels/transmit'
import { DatabaseMessage } from '@facteurjs/adonisjs/channels/database'

/**
 * Example of a queued notification.
 * When sent, this notification will be processed in the background via a job queue.
 */
export default class WelcomeNotification extends Notification<User, { name: string }> {
  static options: NotificationOptions<User> = {
    name: 'Welcome',
    tags: ['Onboarding'],
    // This notification will always be queued
    queue: true,
    deliverBy: {
      database: true,
      transmit: true,
    },
  }

  asTransmitMessage(): TransmitMessage {
    return TransmitMessage.create().setContent({
      title: 'Welcome!',
      body: `Welcome to our platform, ${this.params.name}!`,
      timestamp: new Date().toISOString(),
    })
  }

  asDatabaseMessage(): DatabaseMessage {
    return DatabaseMessage.create()
      .setContent(`Welcome to our platform, ${this.params.name}!`)
      .setType('welcome')
  }
}
