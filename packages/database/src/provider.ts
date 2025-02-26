import type { Provider } from '@facteurjs/core/types'

import type { DatabaseMessage } from './message.js'
import type { DatabaseAdapter, DatabaseConfig } from './types.js'

export { DatabaseMessage } from './message.js'

export function databaseProvider(options: DatabaseConfig) {
  return new DatabaseProvider(options)
}

type DatabaseProviderInterface = Provider<DatabaseConfig, DatabaseMessage, any, any>

export class DatabaseProvider implements DatabaseProviderInterface {
  name = 'database' as const
  #adapter: DatabaseAdapter
  #initialized: Promise<void>

  constructor(config: DatabaseConfig) {
    this.#adapter = config.adapter
    this.#adapter.setTableName(config.tableName || 'notifications')

    if (config.autoCreateTable !== false) {
      this.#initialized = this.#adapter.createTableIfNotExists()
    } else {
      this.#initialized = Promise.resolve()
    }
  }

  async send(options: { notifiable: any; message: DatabaseMessage }) {
    await this.#initialized

    const message = options.message.serialize()
    const result = await this.#adapter.save({
      notifiableId: message.notifiableId || options.notifiable.id,
      content: message.content,
      // TODO: will be awesome if we can get the notification name here by default
      type: message.type,
    })

    return result
  }
}
