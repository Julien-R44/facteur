import { pino } from 'pino'
import SQLite from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'
import { webhookChannel } from '@facteurjs/webhook'
import type { FacteurMessage } from '@facteurjs/core'
import { databaseChannel } from '@facteurjs/database'
import { slackWebhookChannel } from '@facteurjs/slack'
import { Facteur, createFacteur } from '@facteurjs/core'
import { discordWebhookChannel } from '@facteurjs/discord'
import type { QueueItemOptions } from '@facteurjs/core/types'
import { kyselyAdapter } from '@facteurjs/database/adapters/kysely'

const webhooks = {
  slack: 'https://hooks.slack.com/services/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',
  discord: {
    default:
      'https://discord.com/api/webhooks/1371596880093380710/Y18O5mrWy4vZWowe5NdmM1F_VuFJQqc7_UvnniZCfgsf_rTAAJaBzKHBPxtOXT-JXljd',
    marketing:
      'https://discord.com/api/webhooks/1343710574009253910/EYhKJWVKmSzx_X54Pe8Z2CPfDS1DDQwKrbDIE-_5MFft0vCLvle_K7XJ1B0J1yNIxzOC',
  },
}

const dialect = new SqliteDialect({ database: new SQLite('./database.sqlite') })
const kyselySqlite = new Kysely<any>({ dialect })

export const facteur = createFacteur({
  logger: pino({ transport: { target: 'pino-pretty', options: { colorize: true } } }),
  channels: {
    database: databaseChannel({ adapter: kyselyAdapter({ connection: kyselySqlite }) }),
    slack: slackWebhookChannel({ webhookUrl: webhooks.slack }),
    discord: discordWebhookChannel({
      webhooks: {
        marketing: webhooks.discord.marketing,
        default: webhooks.discord.default,
      },
    }),
    webhook: webhookChannel({
      name: 'webhook',
      webhooks: {
        slack: webhooks.slack,
        discord: webhooks.discord.default,
      },
    }),
  },
})

declare module '@facteurjs/core/types' {
  // interface NotificationChannels {
}

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

  // /**
  //  * This will also included as a Notifiable mixin and not in user codebase
  //  */
  // async notify<T extends FacteurMessage<User, any, any>>({
  //   message,
  //   params,
  // }: {
  //   message: T
  //   params: Parameters<T['send']>['0']['params']
  // }) {
  //   return await message.send({ notifiable: this, params })
  // }

  // async notifyLater<T extends FacteurMessage<User, any, any>>(
  //   message: T,
  //   params: Parameters<T['send']>[1],
  //   options: QueueItemOptions,
  // ) {
  //   return await message.sendLater(this, params, options)
  // }

  notificationTargetForDatabase() {
    return {
      notifiableId: this.discordUsername,
    }
  }
}

export const rootUser = new User({
  email: 'julien@ripouteau.com',
  discordOnly: true,
  discordUsername: 'julien8691',
})
