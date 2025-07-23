import User from '#models/user'
import { ChannelName, Notification, ViaParameters } from '@facteurjs/adonisjs/types'
import { DatabaseMessage } from '@facteurjs/adonisjs/channels/database'
import { DiscordMessage } from '@facteurjs/adonisjs/channels/discord'
import { SlackMessage } from '@facteurjs/adonisjs/channels/slack'
import { TransmitMessage } from '@facteurjs/adonisjs/channels/transmit'
import { PossibleMailMessage } from '@facteurjs/adonisjs/channels/mail'
import InvoicePaidMail from '#mails/invoice_paid_notification'

export class InvoicePaidNotification extends Notification<User, { amount: number }> {
  via(_: ViaParameters<User>): ChannelName[] {
    return ['transmit', 'mail', 'database'] as const
  }

  asMailMessage(): PossibleMailMessage {
    return new InvoicePaidMail()
    // return MailMessage.create()
    //   .subject('Invoice Paid')
    //   .text('Your invoice has been successfully paid.')
    //   .from('noreply@example.com')
  }

  asTransmitMessage(): TransmitMessage {
    return TransmitMessage.create().setContent({
      title: 'Invoice Paid',
      body: 'Your invoice has been successfully paid.',
      timestamp: new Date().toISOString(),
    })
  }

  asDatabaseMessage(): DatabaseMessage {
    return DatabaseMessage.create().setContent('Invoice paid').setType('invoice_paid')
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
      .addHeaderBlock('🚀 Notification importante')
  }
}
