import { kyselySqlite } from './drivers.js'
import { bullQueueAdapter } from '../queue.js'
import { slackProvider } from '../../../packages/slack/src/index.js'
import { discordProvider } from '../../../packages/discord/src/index.js'
import type { FacteurMessage } from '../../../packages/core/src/index.js'
import { databaseProvider } from '../../../packages/database/src/index.js'
import type { QueueItemOptions } from '../../../packages/core/src/types.js'
import { kyselyAdapter } from '../../../packages/database/src/adapters/kysely.js'
import { createfacteur, telegramProvider } from '../../../packages/core/src/index.js'

const webhooks = {
  slack: 'https://hooks.slack.com/services/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',
  discord:
    'https://discord.com/api/webhooks/1341903978094530620/Z1-u0Am2NLXBByuSze2bBPB0ToubraH_3wTY9dLptPxQdAJwoDVulNVk01X6YV9fPNRb',
}

export const facteur = createfacteur({
  queueAdapter: bullQueueAdapter({
    connection: { host: 'localhost', port: 6379 },
  }),
  providers: [
    // loggerProvider({ level: 'debug' }),
    databaseProvider({ adapter: kyselyAdapter({ connection: kyselySqlite }) }),
    discordProvider({ webhookUrl: webhooks.discord }),
    telegramProvider({ token: '1234' }),
    // mailProvider({ adapter: adonisJsMailAdapter() }),
    slackProvider({ webhookUrl: webhooks.slack }),
  ],
})

/**
 * Let's say this is a Lucid Model
 */
export class User {
  email: string
  discordOnly: boolean
  discordUsername: string

  constructor(params: { email: string; discordOnly: boolean; discordUsername: string }) {
    this.discordUsername = params.discordUsername
    this.email = params.email
    this.discordOnly = params.discordOnly
  }

  /**
   * This will also included as a Notifiable mixin and not in user codebase
   */
  async notify<T extends FacteurMessage<User, any, any>>(
    message: T,
    params: Parameters<T['send']>[1],
  ) {
    return await message.send(this, params)
  }

  async notifyLater<T extends FacteurMessage<User, any, any>>(
    message: T,
    params: Parameters<T['send']>[1],
    options: QueueItemOptions,
  ) {
    return await message.sendLater(this, params, options)
  }
}

export const rootUser = new User({
  email: 'julien@ripouteau.com',
  discordOnly: true,
  discordUsername: 'julien8691',
})
