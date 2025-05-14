import { configProvider } from '@adonisjs/core'
import { RuntimeException } from '@adonisjs/core/exceptions'
import { DiscordOptions } from '@facteurjs/discord/types'
import { SlackOptions } from '@facteurjs/slack/types'
import { KyselyConfig } from '@facteurjs/database/types'

export const channels = {
  /**
   * Discord channel
   */
  discordWebhook<Options extends DiscordOptions<any>>(config: Options) {
    return configProvider.create(async () => {
      const { discordWebhookChannel } = await import('@facteurjs/discord')
      return discordWebhookChannel(config)
    })
  },

  /**
   * Slack channel
   */
  slackWebhook<Options extends SlackOptions<any>>(config: Options) {
    return configProvider.create(async () => {
      const { slackWebhookChannel } = await import('@facteurjs/slack')
      return slackWebhookChannel(config)
    })
  },

  /**
   * Database channel
   */
  database(config: { connectionName?: string }) {
    return configProvider.create(async (app) => {
      const db = await app.container.make('lucid.db')
      const connectionName = config?.connectionName || db.primaryConnectionName
      const connection = db.manager.get(connectionName)

      /**
       * Throw error when mentioned connection is not specified
       * in the database file
       */
      if (!connection) {
        throw new RuntimeException(
          `Invalid connection name "${connectionName}" referenced by "config/notifications.ts" file. First register the connection inside "config/database.ts" file`
        )
      }

      const { databaseChannel } = await import('@facteurjs/database')
      const { knexAdapter } = await import('@facteurjs/database/adapters/knex')
      return databaseChannel({
        // TODO: add auto create table and all
        adapter: knexAdapter({ connection: db.connection(connectionName).getWriteClient() }),
      })
    })
  },

  /**
   * Kysely channel
   */
  kysely(config: KyselyConfig) {
    return configProvider.create(async () => {
      const { databaseChannel } = await import('@facteurjs/database')
      const { kyselyAdapter } = await import('@facteurjs/database/adapters/kysely')

      return databaseChannel({ adapter: kyselyAdapter({ connection: config.connection }) })
    })
  },
}
