import User from '#models/user'
import { Notification, NotificationChannels, ViaParameters, ViaResult } from '@facteurjs/core/types'
import { DiscordMessage } from '@facteurjs/discord'
import { SlackMessage } from '@facteurjs/slack'
import { Arrayable } from '@julr/utils/types'

type Notifiable = User
export class InvoicePaidNotification extends Notification<User> {
  via(options: ViaParameters<User>): ViaResult {
    return ['discord']
  }

  toDiscord() {
    return DiscordMessage.create().setBotUsername('Test').setBody('Invoice paid')
  }

  toSlack(): SlackMessage {
    return SlackMessage.create().setBody('Invoice paid')
  }
}
