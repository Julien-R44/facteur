import { toArray } from '@julr/utils/array'
import { invoke } from '@julr/utils/functions'
import { capitalize } from '@julr/utils/string'

import type { FacteurOptions } from './options.js'
import type { CreateMessageParams, QueueItemOptions, Provider, Emitter } from './types.js'

export class Notifier {
  constructor()
}

export class FacteurMessage<Notifiable, KnownProviders extends Record<string, Provider>, Payload> {
  #facteurOptions: FacteurOptions<KnownProviders>
  #params: CreateMessageParams<Notifiable, KnownProviders, Payload>
  #emitter: Emitter

  constructor(
    facteurOptions: FacteurOptions<KnownProviders>,
    params: CreateMessageParams<Notifiable, KnownProviders, Payload>,
  ) {
    this.#facteurOptions = facteurOptions
    this.#params = params
    this.#emitter = facteurOptions.emitter
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

    return providerNames.map((name) => {
      const provider = this.#facteurOptions.providers[name]
      if (!provider)
        throw new Error(
          `Provider '${name as string}' was selected through 'via' but does not exist`,
        )

      return { name, provider }
    })
  }

  async send(options: SendOptions<Notifiable, Payload, KnownProviders>) {
    const providers = this.#pickProvidersToUse(options)

    for (const { name, provider } of providers) {
      // @ts-expect-error osef
      const fn = this.#params[`to${capitalize(name)}`]
      const message = fn?.({ notifiable: options.notifiable, params: options.params })
      const targets = options.via?.[name]

      this.#emitter.emit('notifications:message:send', {
        provider: name,
        notifiable: options.notifiable,
        message,
        targets,
        params: options.params,
      })

      await provider.send({ message, targets, notifiable: options.notifiable })

      this.#emitter.emit('notifications:message:sent', {
        provider: name,
        notifiable: options.notifiable,
        message,
        targets,
        params: options.params,
      })
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
