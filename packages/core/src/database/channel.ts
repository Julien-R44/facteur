import { invoke } from '@julr/utils/functions'
import { kTargetSymbol, type Channel, type ChannelSendParams } from '@facteurjs/core/types'

import type { DatabaseMessage } from './message.js'
import type { DatabaseAdapter, DatabaseConfig, Identifier } from './types.js'

export { DatabaseMessage } from './message.js'

export function databaseChannel(options: DatabaseConfig) {
  return new DatabaseChannel(options)
}

type DatabaseTargets = {
  notifiableId: Identifier
  tenantId?: Identifier
}

export class DatabaseChannel
  implements Channel<DatabaseConfig, DatabaseMessage, any, DatabaseTargets>
{
  name = 'database' as const
  #adapter: DatabaseAdapter;
  [kTargetSymbol] = null as any as DatabaseTargets

  constructor(config: DatabaseConfig) {
    this.#adapter = config.adapter
    this.#adapter.setTableName(config.tableName || 'notifications')
  }

  async send(options: ChannelSendParams<DatabaseMessage, DatabaseTargets>) {
    const message = options.message.serialize()

    const notifiableId = invoke(() => {
      if (message.notifiableId) return message.notifiableId

      if (options.notifiable?.[`notificationTargetForDatabase`]) {
        return options.notifiable.notificationTargetForDatabase().notifiableId
      }

      return options.targets?.notifiableId || options.notifiable.id
    })

    const tenantId = invoke(() => {
      if (message.tenantId) return message.tenantId

      if (options.notifiable?.[`notificationTargetForDatabase`]) {
        return options.notifiable.notificationTargetForDatabase().tenantId
      }

      return options.targets?.tenantId || options.tenantId
    })

    if (!notifiableId) throw new Error('No notifiableId provided')

    const result = await this.#adapter.save({
      notifiableId,
      tenantId,
      content: message.content,
      type: message.type,
      status: message.status,
      tags: message.tags,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return result
  }
}

declare module '@facteurjs/core/types' {
  interface Notification<
    N extends Notifiable = Notifiable,
    Params extends Record<string, any> = any,
  > {
    asDatabaseMessage(ctx: MessageCtx<N, Params>): DatabaseMessage
  }
}
