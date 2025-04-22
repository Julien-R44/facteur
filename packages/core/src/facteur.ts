import { FacteurOptions } from './options.js'
import { FacteurMessage } from './message.js'
import type {
  FacteurConfiguration,
  CreateMessageParams,
  ProvidersToTargets,
  Provider,
} from './types.js'

export function createFacteur<T extends Record<string, Provider>>(config: FacteurConfiguration<T>) {
  return new Facteur(config)
}

class Facteur<KnownProviders extends Record<string, Provider>> {
  #options: FacteurOptions<KnownProviders>

  constructor(config: FacteurConfiguration<KnownProviders>) {
    this.#options = new FacteurOptions(config)
  }

  createMessage<Notifiable, Payload>(
    params: CreateMessageParams<Notifiable, KnownProviders, Payload>,
  ) {
    return new FacteurMessage(this.#options, params)
  }

  // send<T extends FacteurMessage<any, any, any>>(
  //   message: T,
  //   payload: T extends FacteurMessage<any, any, infer X> ? X : never,
  //   targets: ProvidersToTargets<KnownProviders>,
  // ) {}

  compose(message: FacteurMessage<any, any, any>) {
    return new MessageComposer(this, message)
  }

  startWorker() {
    this.#options.queueAdapter.startQueueProcessor()
  }

  disconnect() {
    this.#options.queueAdapter.disconnect()
  }
}

class MessageComposer<
  KnownProviders extends Record<string, Provider>,
  T extends FacteurMessage<any, any, any>,
> {
  #targets: ProvidersToTargets<KnownProviders>
  #payload: T extends FacteurMessage<any, any, infer X> ? X : never

  constructor(
    private facteur: Facteur<KnownProviders>,
    private message: T,
  ) {}

  via(targets: ProvidersToTargets<KnownProviders>) {
    this.#targets = targets
    return this
  }

  with(payload: T extends FacteurMessage<any, any, infer X> ? X : never) {
    this.#payload = payload
    return this
  }

  async send() {
    return await this.message.send(null, this.#payload)
  }

  sendLater() {
    return {
      delay: async (ms: number) => {
        return await this.message.sendLater(null, this.#payload, { delay: ms })
      },
      then: async () => {
        return await this.message.sendLater(null, this.#payload, { delay: 0 })
      },
    }
  }
}
