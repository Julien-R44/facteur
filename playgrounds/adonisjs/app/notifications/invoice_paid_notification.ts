import { Notification } from '@facteurjs/adonisjs/types'
import { SlackMessage } from '@facteurjs/adonisjs/channels/slack'
import { DiscordMessage } from '@facteurjs/adonisjs/channels/discord'
import { TransmitMessage } from '@facteurjs/adonisjs/channels/transmit'
import type { Identifier } from '@facteurjs/adonisjs/channels/database'
import { DatabaseMessage } from '@facteurjs/adonisjs/channels/database'
import type { PossibleMailMessage } from '@facteurjs/adonisjs/channels/mail'
import type { NotificationOptions } from '@facteurjs/adonisjs/types'
import { FcmMessage } from '@facteurjs/adonisjs/channels/fcm'

import type User from '#models/user'
import InvoicePaidMail from '#mails/invoice_paid_notification'
import { TwilioMessage } from '@facteurjs/adonisjs/channels/twilio'
import { WebpushMessage } from '@facteurjs/adonisjs/channels/webpush'

interface InvoicePaidParams {
  amount: number
}

export default class InvoicePaidNotification extends Notification<User, InvoicePaidParams> {
  static options: NotificationOptions<User> = {
    name: 'Invoice Paid',
    category: 'billing',
    deliverBy: {
      database: true,
      transmit: true,
      webpush: false,
      mail: true,
      slack: false,
      discord: false,
      twilio: false,
      fcm: false,
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

  asDatabaseMessage(): DatabaseMessage {
    return DatabaseMessage.create()
      .setContent({
        title: 'Invoice Paid',
        body: `Your invoice of $${this.params.amount} has been successfully paid.`,
        organization: this.#getOrganizationName(this.tenantId),
      })
      .setType('invoice_paid')
  }

  asDiscordMessage() {
    return DiscordMessage.create().setBotUsername('Test').setBody('Invoice paid')
  }

  asWebpushMessage(): WebpushMessage {
    return WebpushMessage.create()
      .setTitle('Invoice Paid')
      .setBody(`Your invoice of $${this.params.amount} has been successfully paid.`)
      .setIcon('/mailbox.png')
      .setTag('invoice-paid')
      .setData({
        type: 'invoice_paid',
        amount: this.params.amount.toString(),
        organization: this.#getOrganizationName(this.tenantId),
      })
      .setTag('invoice-paid')
      .setActions([
        { action: 'view', title: 'View Invoice' },
        { action: 'dismiss', title: 'Dismiss' },
      ])
      .setRequireInteraction(false)
  }

  asSlackMessage(): SlackMessage {
    return SlackMessage.create()
      .setText('Hello from Facteur!')
      .setBotUsername('Facteur Bot')
      .setBotIconEmoji(':robot_face:')
      .setChannel('#general')
  }

  asTwilioMessage(): TwilioMessage {
    return TwilioMessage.create().setBody('Post liked!!')
  }

  asFcmMessage(): FcmMessage {
    return FcmMessage.create()
      .setTitle('Yo! Invoice Paid')
      .setBody(`Your invoice of $${this.params.amount} has been successfully paid....`)
      .setData({
        type: 'invoice_paid',
        amount: this.params.amount.toString(),
        organization: this.#getOrganizationName(this.tenantId),
      })
  }
}
