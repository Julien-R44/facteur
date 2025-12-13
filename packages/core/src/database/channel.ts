import type { DatabaseAdapter, DatabaseConfig, Identifier } from './types.js'
import type { DatabaseMessage } from './message.js'

import { kTargetSymbol, type Channel, type ChannelSendParams } from '../types/index.js'
import { errors } from '../errors/index.js'

export { DatabaseMessage } from './message.js'

export function databaseChannel(options: DatabaseConfig) {
  return new DatabaseChannel(options)
}

type DatabaseTargets = {
  notifiableId: Identifier
  tenantId?: Identifier
}

export class DatabaseChannel implements Channel<
  DatabaseConfig,
  DatabaseMessage,
  any,
  DatabaseTargets
> {
  name = 'database' as const
  #adapter: DatabaseAdapter;
  [kTargetSymbol] = null as any as DatabaseTargets

  constructor(config: DatabaseConfig) {
    this.#adapter = config.adapter
  }

  #resolveTargets(options: ChannelSendParams<DatabaseMessage, DatabaseTargets>): DatabaseTargets {
    if (options.targets) return options.targets

    throw new errors.E_UNAVAILABLE_TARGETS(['DATABASE'])
  }

  async send(options: ChannelSendParams<DatabaseMessage, DatabaseTargets>) {
    const message = options.message.serialize()
    const targets = this.#resolveTargets(options)

    const notifiableId = message.notifiableId || targets.notifiableId
    const tenantId = message.tenantId || targets.tenantId || options.tenantId

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
  interface Notification {
    asDatabaseMessage(): DatabaseMessage
  }
}
