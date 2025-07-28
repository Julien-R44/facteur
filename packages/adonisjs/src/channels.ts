/// <reference types="@adonisjs/redis/redis_provider" />
/// <reference types="@adonisjs/lucid/database_provider" />
/// <reference types="@adonisjs/transmit/transmit_provider" />
/// <reference types="@adonisjs/mail/mail_provider" />

import { configProvider } from '@adonisjs/core'
import { RuntimeException } from '@adonisjs/core/exceptions'
import type { SlackOptions } from '@facteurjs/core/channels/slack/types'
import type { TwilioConfig } from '@facteurjs/core/channels/twilio/types'
import type { DiscordOptions } from '@facteurjs/core/channels/discord/types'
import type { FcmConfig } from '@facteurjs/core/channels/fcm/types'
import type { WebpushConfig } from '@facteurjs/core/channels/webpush/types'

import type { KyselyConfig } from './channels/database.js'
import type { ConfigProvider } from '@adonisjs/core/types'
import type { DiscordProvider } from './channels/discord.js'
import type { DatabaseChannel } from './channels/database.js'
import type { TwilioChannel } from './channels/twilio.js'
import type { TransmitChannel } from './channels/transmit.js'
import type { MailChannel } from './channels/mail.js'
import type { FcmChannel } from './channels/fcm.js'
import type { WebpushChannel } from './channels/webpush.js'

export interface DatabaseConfig {
  connectionName?: string
  tableNames?: {
    notifications?: string
    preferences?: string
  }
}

export const channels: {
  discordWebhook<Options extends DiscordOptions<any>>(
    config: Options,
  ): ConfigProvider<DiscordProvider<Options>>
  slackWebhook<Options extends SlackOptions<any>>(
    config: Options,
  ): ConfigProvider<DiscordProvider<Options>>
  database(config: DatabaseConfig): ConfigProvider<DatabaseChannel>
  kysely(config: KyselyConfig): ConfigProvider<DatabaseChannel>
  twilio(config: TwilioConfig): ConfigProvider<TwilioChannel>
  transmit(): ConfigProvider<TransmitChannel>
  mail(): ConfigProvider<MailChannel>
  fcm(config: FcmConfig): ConfigProvider<FcmChannel>
  webpush(config: WebpushConfig): ConfigProvider<WebpushChannel>
} = {
  /**
   * Discord channel
   */
  discordWebhook<Options extends DiscordOptions<any>>(config: Options) {
    return configProvider.create(async () => {
      const { discordWebhookChannel } = await import('@facteurjs/core/channels/discord')
      return discordWebhookChannel(config)
    })
  },

  /**
   * Slack channel
   */
  slackWebhook<Options extends SlackOptions<any>>(config: Options) {
    return configProvider.create(async () => {
      const { slackWebhookChannel } = await import('@facteurjs/core/channels/slack')
      return slackWebhookChannel(config)
    })
  },

  /**
   * Database channel
   */
  database(config: DatabaseConfig) {
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
          `Invalid connection name "${connectionName}" referenced by "config/notifications.ts" file. First register the connection inside "config/database.ts" file`,
        )
      }

      const { databaseChannel } = await import('@facteurjs/core/database')
      const { knexAdapter } = await import('@facteurjs/core/database/adapters/knex')
      return databaseChannel({
        adapter: knexAdapter({
          connection: db.connection(connectionName).getWriteClient(),
          tableNames: {
            notifications: config?.tableNames?.notifications || 'notifications',
            preferences: config?.tableNames?.preferences || 'notification_preferences',
          },
        }),
      })
    })
  },

  /**
   * Kysely channel
   */
  kysely(config: KyselyConfig) {
    return configProvider.create(async () => {
      const { databaseChannel } = await import('@facteurjs/core/database')
      const { kyselyAdapter } = await import('@facteurjs/core/database/adapters/kysely')

      return databaseChannel({ adapter: kyselyAdapter({ connection: config.connection }) })
    })
  },

  /**
   * Twilio SMS Channel
   */
  twilio(config: TwilioConfig) {
    return configProvider.create(async () => {
      const { twilioChannel } = await import('@facteurjs/core/channels/twilio')
      return twilioChannel(config)
    })
  },

  /**
   * Transmit Channel
   */
  transmit() {
    return configProvider.create(async (app) => {
      const { transmitChannel } = await import('@facteurjs/core/channels/transmit')
      const transmit = await app.container.make('transmit')

      return transmitChannel({ transmit: transmit as any })
    })
  },

  /**
   * Mail channel
   */
  mail() {
    return configProvider.create(async (app) => {
      const { mailChannel } = await import('./channels/mail.js')
      const mailer = await app.container.make('mail.manager')

      return mailChannel({ mailer })
    })
  },

  /**
   * Firebase Cloud Messaging channel
   */
  fcm(config: FcmConfig) {
    return configProvider.create(async () => {
      const { fcmChannel } = await import('@facteurjs/core/channels/fcm')

      return fcmChannel(config)
    })
  },

  /**
   * Web Push channel (VAPID)
   */
  webpush(config: WebpushConfig) {
    return configProvider.create(async () => {
      const { webpushChannel } = await import('@facteurjs/core/channels/webpush')

      return webpushChannel(config)
    })
  },
}
