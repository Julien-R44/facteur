import EventEmitter from 'node:events'
import { type Logger, noopLogger } from '@julr/utils/logger'

import { errors } from './errors/index.js'
import type { DatabaseAdapter } from './database/types.js'
import type { Emitter, QueueAdapter, FacteurConfiguration, Channel } from './types.js'

export class FacteurOptions<
  KnownChannels extends Record<string, Channel>,
  DBAdapter extends DatabaseAdapter | null = null,
> {
  logger: Logger = noopLogger()
  emitter: Emitter = new EventEmitter()
  channels: KnownChannels
  queueAdapter: QueueAdapter
  databaseAdapter: DBAdapter | null = null

  constructor(config: FacteurConfiguration<KnownChannels, DBAdapter>) {
    this.logger = config.logger ?? this.logger
    this.emitter = config.emitter ?? this.emitter
    this.channels = config.channels
    this.databaseAdapter = config.databaseAdapter ?? null

    const throwIfQueueNotSet = () => {
      throw new errors.E_QUEUE_NOT_SET()
    }

    this.queueAdapter = config.queueAdapter || {
      queue: throwIfQueueNotSet,
      startQueueProcessor: throwIfQueueNotSet,
      disconnect: throwIfQueueNotSet,
    }
  }
}
