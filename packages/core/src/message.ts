import { toArray } from '@julr/utils/array'
import { invoke } from '@julr/utils/functions'
import { capitalize } from '@julr/utils/string'

import type { FacteurOptions } from './options.js'
import type { CreateMessageParams, QueueItemOptions, Provider } from './types.js'

export class FacteurMessage<Notifiable, KnownProviders extends Record<string, Provider>, Payload> {
  #facteurOptions: FacteurOptions<KnownProviders>
  #params: CreateMessageParams<Notifiable, KnownProviders, Payload>

  constructor(
    facteurOptions: FacteurOptions<KnownProviders>,
    params: CreateMessageParams<Notifiable, KnownProviders, Payload>,
  ) {
    this.#facteurOptions = facteurOptions
    this.#params = params
  }

  #pickProvidersToUse(notifiable: Notifiable) {
    const providerNames = invoke(() => {
      if (this.#params.via) return toArray(this.#params.via(notifiable))

      return Object.keys(this.#facteurOptions.providers)
    })

    return providerNames.map((providerName) => {
      const provider = this.#facteurOptions.providers[providerName]
      if (!provider)
        throw new Error(
          `Provider '${providerName as string}' was selected through 'via' but does not exist`,
        )

      return { providerName, provider }
    })
  }

  async send(notifiable: Notifiable, params: Payload) {
    const providers = this.#pickProvidersToUse(notifiable)

    for (const provider of providers) {
      // @ts-expect-error osef
      const fn = this.#params[`to${capitalize(provider.providerName)}`]
      const message = fn?.({ notifiable, params })

      await provider.provider.send({ message, notifiable })
    }
  }

  async sendLater(notifiable: Notifiable, params: Payload, options: QueueItemOptions) {
    await this.#facteurOptions.queueAdapter.queue({ notifiable, message: { params } }, options)
  }
}
