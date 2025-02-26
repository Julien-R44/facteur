import { toArray } from '@julr/utils/array'
import { invoke } from '@julr/utils/functions'
import { capitalize } from '@julr/utils/string'

import type { FacteurOptions } from './options.js'
import type { FacteurProviderFactory, CreateMessageParams, QueueItemOptions } from './types.js'

export class FacteurMessage<Notifiable, Providers extends FacteurProviderFactory, Payload> {
  #facteurOptions: FacteurOptions<Providers>
  #params: CreateMessageParams<Notifiable, Providers, Payload>

  constructor(
    facteurOptions: FacteurOptions<Providers>,
    params: CreateMessageParams<Notifiable, Providers, Payload>,
  ) {
    this.#facteurOptions = facteurOptions
    this.#params = params
  }

  #pickProvidersToUse(notifiable: Notifiable) {
    const providerNames = invoke(() => {
      if (this.#params.via) return toArray(this.#params.via(notifiable))

      return this.#facteurOptions.providers.map((p) => p.name)
    })

    return providerNames.map((providerName) => {
      const provider = this.#facteurOptions.providers.find((p) => p.name === providerName)
      // TODO better error message
      if (!provider) throw new Error(`Provider ${providerName} not found`)

      return provider
    })
  }

  async send(notifiable: Notifiable, params: Payload) {
    const providers = this.#pickProvidersToUse(notifiable)

    for (const provider of providers) {
      // @ts-expect-error osef
      const fn = this.#params[`to${capitalize(provider.name)}`]
      const message = fn?.({ notifiable, params })

      provider.send({ message, notifiable })
    }
  }

  async sendLater(notifiable: Notifiable, params: Payload, options: QueueItemOptions) {
    await this.#facteurOptions.queueAdapter.queue({ notifiable, message: { params } }, options)
  }
}
