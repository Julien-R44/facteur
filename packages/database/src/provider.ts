import { asyncNoop, invoke, once } from '@julr/utils/functions'
import { kTargetSymbol, type Provider, type ProviderSendParams } from '@facteurjs/core/types'

import type { DatabaseMessage } from './message.js'
import type { DatabaseAdapter, DatabaseConfig } from './types.js'

export { DatabaseMessage } from './message.js'

export function databaseProvider(options: DatabaseConfig) {
  return new DatabaseProvider(options)
}

type DatabaseTargets = {
  notifiableId: string
}

export class DatabaseProvider
  implements Provider<DatabaseConfig, DatabaseMessage, any, DatabaseTargets>
{
  name = 'database' as const
  #adapter: DatabaseAdapter;
  [kTargetSymbol] = null as any as DatabaseTargets
  initializer: () => Promise<any>

  constructor(config: DatabaseConfig) {
    this.#adapter = config.adapter
    this.#adapter.setTableName(config.tableName || 'notifications')

    if (config.autoCreateTable !== false) {
      this.initializer = once(async () => await this.#adapter.createTableIfNotExists())
    } else {
      this.initializer = asyncNoop
    }
  }

  async send(options: ProviderSendParams<DatabaseMessage, DatabaseTargets>) {
    await this.initializer()
    const message = options.message.serialize()

    const notifiableId = invoke(() => {
      if (message.notifiableId) return message.notifiableId

      if (options.notifiable?.[`notificationTargetForDatabase`]) {
        return options.notifiable.notificationTargetForDatabase().notifiableId
      }

      return options.targets?.notifiableId || options.notifiable.id
    })

    if (!notifiableId) throw new Error('No notifiableId provided')

    const result = await this.#adapter.save({
      notifiableId,
      content: message.content,
      type: message.type,
    })

    return result
  }
}
