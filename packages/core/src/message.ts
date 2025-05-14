import { toArray } from '@julr/utils/array'
import { invoke } from '@julr/utils/functions'
import { capitalize } from '@julr/utils/string'

import type { FacteurOptions } from './options.js'
import type { CreateMessageParams, QueueItemOptions, Channel, Emitter } from './types.js'

export class FacteurMessage<Notifiable, KnownChannels extends Record<string, Channel>, Payload> {
  #facteurOptions: FacteurOptions<KnownChannels>
  #params: CreateMessageParams<Notifiable, KnownChannels, Payload>
  #emitter: Emitter

  constructor(
    facteurOptions: FacteurOptions<KnownChannels>,
    params: CreateMessageParams<Notifiable, KnownChannels, Payload>,
  ) {
    this.#facteurOptions = facteurOptions
    this.#params = params
    this.#emitter = facteurOptions.emitter
  }

  #pickChannelsToUse(options: SendOptions<any, any, any>) {
    const channelNames = invoke(() => {
      // First priority is the `via` options
      if (options.via) return Object.keys(options.via)

      // Second priority is the `via` method of the message
      if (this.#params.via) return toArray(this.#params.via(options.notifiable))

      // Otherwise, we use all channels
      return Object.keys(this.#facteurOptions.channels)
    })

    return channelNames.map((name) => {
      const channel = this.#facteurOptions.channels[name]
      if (!channel)
        throw new Error(`Channel '${name as string}' was selected through 'via' but does not exist`)

      return { name, channel }
    })
  }

  async send(options: SendOptions<Notifiable, Payload, KnownChannels>) {
    const channels = this.#pickChannelsToUse(options)

    for (const { name, channel } of channels) {
      // @ts-expect-error osef
      const fn = this.#params[`to${capitalize(name)}`]
      const message = fn?.({ notifiable: options.notifiable, params: options.params })
      const targets = options.via?.[name]

      this.#emitter.emit('notifications:message:send', {
        channel: name,
        notifiable: options.notifiable,
        message,
        targets,
        params: options.params,
      })

      await channel.send({ message, targets, notifiable: options.notifiable })

      this.#emitter.emit('notifications:message:sent', {
        channel: name,
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

export type ExtractChannelTargets<T> = T extends Channel<any, any, any, infer U> ? U : never

export type SendOptions<Notifiable, Payload, KnownChannels extends Record<string, Channel>> =
  | {
      notifiable: Notifiable
      params: Payload
      via?: { [K in keyof KnownChannels]?: boolean | ExtractChannelTargets<KnownChannels[K]> }
    }
  | {
      notifiable?: null | undefined
      params: Payload
      via: { [K in keyof KnownChannels]?: ExtractChannelTargets<KnownChannels[K]> }
    }
