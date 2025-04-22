import EventEmitter from 'node:events'
import { type Logger, noopLogger } from '@julr/utils/logger'

import { errors } from './exceptions.js'
import type { Emitter, QueueAdapter, FacteurConfiguration, Provider } from './types.js'

export class FacteurOptions<KnownProviders extends Record<string, Provider>> {
  logger: Logger = noopLogger()
  emitter: Emitter = new EventEmitter()
  providers: KnownProviders
  queueAdapter: QueueAdapter

  constructor(config: FacteurConfiguration<KnownProviders>) {
    this.logger = config.logger ?? this.logger
    this.emitter = config.emitter ?? this.emitter
    this.providers = config.providers

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
