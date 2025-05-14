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

  #pickProvidersToUse(options: SendOptions<any, any, any>) {
    const providerNames = invoke(() => {
      // First priority is the `via` options
      if (options.via) return Object.keys(options.via)

      // Second priority is the `via` method of the message
      if (this.#params.via) return toArray(this.#params.via(options.notifiable))

      // Otherwise, we use all providers
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

  async send(options: SendOptions<Notifiable, Payload, KnownProviders>) {
    const providers = this.#pickProvidersToUse(options)

    for (const provider of providers) {
      // @ts-expect-error osef
      const fn = this.#params[`to${capitalize(provider.providerName)}`]
      const message = fn?.({ notifiable: options.notifiable, params: options.params })
      const targets = options.via?.[provider.providerName]

      await provider.provider.send({ message, notifiable: options.notifiable, targets })
    }
  }

  async sendLater(notifiable: Notifiable, params: Payload, options: QueueItemOptions) {
    await this.#facteurOptions.queueAdapter.queue({ notifiable, message: { params } }, options)
  }
}

type ExtractProviderTargets<T> = T extends Provider<any, any, any, infer U> ? U : never

type SendOptions<Notifiable, Payload, KnownProviders extends Record<string, Provider>> =
  | {
      notifiable: Notifiable
      params: Payload
      via?: { [K in keyof KnownProviders]?: boolean | ExtractProviderTargets<KnownProviders[K]> }
    }
  | {
      notifiable?: null | undefined
      params: Payload
      via: { [K in keyof KnownProviders]?: ExtractProviderTargets<KnownProviders[K]> }
    }
