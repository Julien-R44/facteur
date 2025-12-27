import { RuntimeException } from '@adonisjs/core/exceptions'
import { configProvider } from '@adonisjs/core'
import type { Database } from '@adonisjs/lucid/database'

import type { DatabaseAdapterCommonOptions, KyselyConfig } from '../channels/database.js'

export const databases = {
  lucid(config: DatabaseAdapterCommonOptions & { connectionName?: string }) {
    return configProvider.create(async (app) => {
      const db: Database = await app.container.make('lucid.db')
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

      const { knexAdapter } = await import('@facteurjs/core/database/adapters/knex')
      return knexAdapter({
        connection: db.connection(connectionName).getWriteClient(),
        tableNames: {
          notifications: config?.tableNames?.notifications,
          preferences: config?.tableNames?.preferences,
        },
      })
    })
  },

  kysely(config: KyselyConfig) {
    return configProvider.create(async () => {
      const { kyselyAdapter } = await import('@facteurjs/core/database/adapters/kysely')

      return kyselyAdapter({ connection: config.connection })
    })
  },
}
