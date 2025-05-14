import EventEmitter from 'node:events'
import { type Logger, noopLogger } from '@julr/utils/logger'

import { errors } from './exceptions.js'
import type { Emitter, QueueAdapter, FacteurConfiguration, Channel } from './types.js'

export class FacteurOptions<KnownChannels extends Record<string, Channel>> {
  logger: Logger = noopLogger()
  emitter: Emitter = new EventEmitter()
  channels: KnownChannels
  queueAdapter: QueueAdapter

  constructor(config: FacteurConfiguration<KnownChannels>) {
    this.logger = config.logger ?? this.logger
    this.emitter = config.emitter ?? this.emitter
    this.channels = config.channels

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
