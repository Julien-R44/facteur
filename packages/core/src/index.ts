import EventEmitter from 'node:events'
import { capitalize } from '@julr/utils/string'
import { noopLogger, type Logger } from '@julr/utils/logger'

import type {
  FacteurConfiguration,
  FacteurProviderFactory,
  CreateMessageParams,
  Emitter,
  Provider,
  QueueAdapter,
  QueueItemOptions,
} from './types.js'

export function defineProvider<Options, Message, Response>(
  name: string,
  factory: (options: Options) => Provider<any, Message, Response>,
) {
  return (options: Options) => ({
    name,
    provider: factory(options),
  })
}

export const telegramProvider = defineProvider<{ token: string }, any, any>(
  'telegram',
  (options) => ({
    send(data) {
      console.log('Sending telegram message', data, options)
    },
  }),
)

class FacteurOptions<Providers extends FacteurProviderFactory> {
  logger: Logger = noopLogger()
  emitter: Emitter = new EventEmitter()
  providers: Providers[]
  queueAdapter: QueueAdapter

  constructor(config: FacteurConfiguration<Providers>) {
    this.logger = config.logger ?? this.logger
    this.emitter = config.emitter ?? this.emitter
    this.providers = config.providers
    this.queueAdapter = config.queueAdapter || {
      queue: () => {
        throw new Error('Queue adapter not set')
      },
      startQueueProcessor: () => {
        throw new Error('Queue adapter not set')
      },
      disconnect: () => {
        throw new Error('Queue adapter not set')
      },
    }
  }
}

export class FacteurMessage<Notifiable, Providers extends FacteurProviderFactory, Payload> {
  constructor(
    private facteurOptions: FacteurOptions<Providers>,
    private params: CreateMessageParams<Notifiable, Providers, Payload>,
  ) {}

  async send(notifiable: Notifiable, params: Payload) {
    const providersToUse = this.params.via(notifiable)
    // let responses: Record<Providers['name'], any> = {}

    for (const providerToUse of providersToUse) {
      // @ts-expect-error sdf
      const fn = this.params[`to${capitalize(providerToUse)}`]
      const message = fn?.({ notifiable, params })

      const provider = this.facteurOptions.providers.find((p) => p.name === providerToUse)
      if (!provider) throw new Error(`Provider ${provider} not found`)

      provider.provider.send({ message, notifiable: {} })
    }
  }

  async sendLater(notifiable: Notifiable, params: Payload, options: QueueItemOptions) {
    await this.facteurOptions.queueAdapter.queue({ notifiable, message: { params } }, options)
  }
}

class Facteur<Providers extends FacteurProviderFactory> {
  #options: FacteurOptions<Providers>

  constructor(config: FacteurConfiguration<Providers>) {
    this.#options = new FacteurOptions(config)
  }

  createMessage<Notifiable, Payload>(params: CreateMessageParams<Notifiable, Providers, Payload>) {
    return new FacteurMessage(this.#options, params)
  }

  startWorker() {
    this.#options.queueAdapter.startQueueProcessor()
  }

  disconnect() {
    this.#options.queueAdapter.disconnect()
  }
}

export function createfacteur<T extends FacteurProviderFactory>(config: FacteurConfiguration<T>) {
  return new Facteur(config)
}
