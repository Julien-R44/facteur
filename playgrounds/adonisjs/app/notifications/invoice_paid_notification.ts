import User from '#models/user'
import { MessageCtx, Notification, NotificationOptions } from '@facteurjs/adonisjs/types'
import { DatabaseMessage } from '@facteurjs/adonisjs/channels/database'
import { DiscordMessage } from '@facteurjs/adonisjs/channels/discord'
import { SlackMessage } from '@facteurjs/adonisjs/channels/slack'
import { TransmitMessage } from '@facteurjs/adonisjs/channels/transmit'
import { PossibleMailMessage } from '@facteurjs/adonisjs/channels/mail'
import InvoicePaidMail from '#mails/invoice_paid_notification'

interface InvoicePaidParams {
  amount: number
}

export default class InvoicePaidNotification extends Notification<User, { amount: number }> {
  static options: NotificationOptions<User> = {
    name: 'Invoice Paid',
    tags: ['Billing'],
    deliverBy: { database: true, transmit: true, discord: false, slack: false, mail: true },
  }

  asMailMessage(): PossibleMailMessage {
    return new InvoicePaidMail()
  }

  asTransmitMessage(): TransmitMessage {
    return TransmitMessage.create().setContent({
      title: 'Invoice Paid',
      body: 'Your invoice has been successfully paid.',
      timestamp: new Date().toISOString(),
    })
  }

  asDatabaseMessage({ notifiable }: MessageCtx<User, InvoicePaidParams>): DatabaseMessage {
    console.log('notifiable:', notifiable)
    return DatabaseMessage.create()
      .setContent('Invoice paid')
      .setType('invoice_paid')
      .setTenantId(Math.floor(Math.random() * 2 + 1))
  }

  asDiscordMessage() {
    return DiscordMessage.create().setBotUsername('Test').setBody('Invoice paid')
  }

  asSlackMessage(): SlackMessage {
    return SlackMessage.create()
      .setText('Hello from Facteur!')
      .setBotUsername('Facteur Bot')
      .setBotIconEmoji(':robot_face:')
      .setChannel('#general')
  }
}
