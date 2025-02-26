import EventEmitter from 'node:events'
import { type Logger, noopLogger } from '@julr/utils/logger'

import { errors } from './exceptions.js'
import type {
  FacteurProviderFactory,
  Emitter,
  QueueAdapter,
  FacteurConfiguration,
} from './types.js'

export class FacteurOptions<Providers extends FacteurProviderFactory> {
  logger: Logger = noopLogger()
  emitter: Emitter = new EventEmitter()
  providers: Providers[]
  queueAdapter: QueueAdapter

  constructor(config: FacteurConfiguration<Providers>) {
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
