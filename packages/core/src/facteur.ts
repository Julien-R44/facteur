import { FacteurOptions } from './options.js'
import { FacteurMessage } from './message.js'
import type { FacteurConfiguration, CreateMessageParams, Provider } from './types.js'

export function createFacteur<T extends Record<string, Provider>>(config: FacteurConfiguration<T>) {
  return new Facteur(config)
}

class Facteur<KnownProviders extends Record<string, Provider>> {
  #options: FacteurOptions<KnownProviders>

  constructor(config: FacteurConfiguration<KnownProviders>) {
    this.#options = new FacteurOptions(config)
  }

  defineMessage<Notifiable, Payload>(
    messageFactory: () => CreateMessageParams<Notifiable, KnownProviders, Payload>,
  ) {
    return new FacteurMessage(this.#options, messageFactory())
  }

  startWorker() {
    this.#options.queueAdapter.startQueueProcessor()
  }

  disconnect() {
    this.#options.queueAdapter.disconnect()
  }
}
