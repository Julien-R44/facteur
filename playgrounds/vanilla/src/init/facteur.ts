import { pino } from 'pino'
import SQLite from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'
import { createFacteur } from '@facteurjs/core'
import { webhookProvider } from '@facteurjs/webhook'
import type { FacteurMessage } from '@facteurjs/core'
import { databaseProvider } from '@facteurjs/database'
import { discordWebhookProvider } from '@facteurjs/discord'
import type { QueueItemOptions } from '@facteurjs/core/types'
import { kyselyAdapter } from '@facteurjs/database/adapters/kysely'

const webhooks = {
  slack: 'https://hooks.slack.com/services/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',
  discord: {
    default:
      'https://discord.com/api/webhooks/1343710934870523914/_2-322y4d65GsM4FL4dbvpQ4ICnGPVEI1PoOYFaX9QWrC3b7yHvY8Z3q0QfbJHVEEekS',
    marketing:
      'https://discord.com/api/webhooks/1343710574009253910/EYhKJWVKmSzx_X54Pe8Z2CPfDS1DDQwKrbDIE-_5MFft0vCLvle_K7XJ1B0J1yNIxzOC',
  },
}

const dialect = new SqliteDialect({ database: new SQLite('./database.sqlite') })
const kyselySqlite = new Kysely<any>({ dialect })

export const facteur = createFacteur({
  logger: pino({ transport: { target: 'pino-pretty', options: { colorize: true } } }),
  providers: {
    // database: databaseProvider({
    //   adapter: kyselyAdapter({ connection: kyselySqlite }),
    // }),
    discord: discordWebhookProvider({
      webhooks: {
        default: webhooks.discord.default,
        marketing: webhooks.discord.marketing,
      },
    }),
    // myProvider: webhookProvider({
    //   webhookUrl:
    //     'https://hooks.slack.com/services/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',
    // }),
  },
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
