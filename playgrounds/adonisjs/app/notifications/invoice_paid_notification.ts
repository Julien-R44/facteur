import User from '#models/user'
import { MessageCtx, Notification, NotificationOptions } from '@facteurjs/adonisjs/types'
import { DatabaseMessage, Identifier } from '@facteurjs/adonisjs/channels/database'
import { DiscordMessage } from '@facteurjs/adonisjs/channels/discord'
import { SlackMessage } from '@facteurjs/adonisjs/channels/slack'
import { TransmitMessage } from '@facteurjs/adonisjs/channels/transmit'
import { PossibleMailMessage } from '@facteurjs/adonisjs/channels/mail'
import InvoicePaidMail from '#mails/invoice_paid_notification'

interface InvoicePaidParams {
  amount: number
}

export default class InvoicePaidNotification extends Notification<User, InvoicePaidParams> {
  static options: NotificationOptions<User> = {
    name: 'Invoice Paid',
    tags: ['Billing'],
    deliverBy: {
      database: true,
      transmit: true,
      mail: true,
      slack: false,
      discord: false,
      twilio: false,
    },
  }

  #getOrganizationName(tenantId?: Identifier): string {
    const orgMap: Record<string, string> = {
      'acme-corp': 'Acme Corporation',
      'tech-startup': 'Tech Startup Inc.',
      'consulting-firm': 'Consulting Firm Ltd.',
      'creative-agency': 'Creative Agency',
    }
    return orgMap[tenantId || 'acme-corp'] || 'Unknown Organization'
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

  asDatabaseMessage({ params, tenantId }: MessageCtx<User, InvoicePaidParams>): DatabaseMessage {
    return DatabaseMessage.create()
      .setContent({
        title: 'Invoice Paid',
        body: `Your invoice of $${params.amount} has been successfully paid.`,
        organization: this.#getOrganizationName(tenantId),
      })
      .setType('invoice_paid')
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
