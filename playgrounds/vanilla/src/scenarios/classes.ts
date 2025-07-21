import { SlackMessage } from '@facteurjs/slack'
import { DiscordMessage } from '@facteurjs/discord'
import { Notification } from '@facteurjs/core/types'
import type { ViaParameters, ViaResult } from '@facteurjs/core/types'

import { facteur } from '../init/facteur.js'

class User {
  id = 1
  email = 'julien@ripouteau.com'
}

const user = new User()

export class InvoicePaidNotification extends Notification<User> {
  via(_options: ViaParameters<User>): ViaResult {
    return ['discord']
  }

  override toDiscord() {
    return DiscordMessage.create().setBotUsername('Test').setBody('Invoice paid')
  }

  override toSlack(): SlackMessage {
    return SlackMessage.create().setBody('Invoice paid')
  }
}

user.send({
  message: new InvoicePaidNotification(),
})
