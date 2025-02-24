import { defineProvider } from '@facteurjs/core'

import type { DatabaseConfig } from './types.js'
import { DatabaseProvider } from './database.js'
import type { DatabaseMessage } from './message.js'

export const databaseProvider = defineProvider<DatabaseConfig, DatabaseMessage, any>(
  'database' as const,
  (providerOptions) => {
    const database = new DatabaseProvider(providerOptions.adapter, providerOptions)

    return {
      async send(options) {
        const message = options.message.serialize()

        const result = await database.save({
          notifiableId: message.notifiableId || options.notifiable.id,
          content: message.content,
          // TODO: will be awesome if we can get the notification name here by default
          type: message.type,
        })

        return result
      },
    }
  },
)
