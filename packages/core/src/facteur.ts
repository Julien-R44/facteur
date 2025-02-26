import { FacteurOptions } from './options.js'
import { FacteurMessage } from './message.js'
import type {
  FacteurProviderFactory,
  FacteurConfiguration,
  CreateMessageParams,
  ProvidersToTargets,
} from './types.js'

export function createFacteur<T extends FacteurProviderFactory>(config: FacteurConfiguration<T>) {
  return new Facteur(config)
}

class Facteur<Providers extends FacteurProviderFactory> {
  #options: FacteurOptions<Providers>

  constructor(config: FacteurConfiguration<Providers>) {
    this.#options = new FacteurOptions(config)
  }

  createMessage<Notifiable, Payload>(params: CreateMessageParams<Notifiable, Providers, Payload>) {
    return new FacteurMessage(this.#options, params)
  }

  send<T extends FacteurMessage<any, any, any>>(
    message: T,
    payload: T extends FacteurMessage<any, any, infer X> ? X : never,
    targets: ProvidersToTargets<Providers>,
  ) {}

  startWorker() {
    this.#options.queueAdapter.startQueueProcessor()
  }

  compose<T extends FacteurMessage<any, any, any>>(message: T) {
    return {
      via(targets: ProvidersToTargets<Providers>) {
        return {
          with(payload: T extends FacteurMessage<any, any, infer X> ? X : never) {
            return {
              send() {
                return message.send({}, payload)
              },
            }
          },
        }
      },
    }
  }

  disconnect() {
    this.#options.queueAdapter.disconnect()
  }
}
