import User from '#models/user'
import { Notification, ViaParameters, ViaResult } from '@facteurjs/core/types'
import { DiscordMessage } from '@facteurjs/discord'

type Notifiable = User | { foo: string }
export class InvoicePaidNotification implements Notification<Notifiable> {
  via({ notifiable }: ViaParameters<Notifiable>): ViaResult {
    if (notifiable) return ['discord']

    return ['discord']
  }

  toDiscord() {
    return DiscordMessage.create().setBotUsername('Test').setBody('Invoice paid')
  }
}
