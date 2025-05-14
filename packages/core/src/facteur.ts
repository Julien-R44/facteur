import { invoke } from '@julr/utils/functions'

import { FacteurOptions } from './options.js'
import { FacteurMessage, type SendOptions } from './message.js'
import type { FacteurConfiguration, CreateMessageParams, Channel, Notification } from './types.js'

export function createFacteur<T extends Record<string, Channel>>(config: FacteurConfiguration<T>) {
  return new Facteur(config)
}

export class Facteur<KnownChannels extends Record<string, Channel>> {
  #options: FacteurOptions<KnownChannels>

  constructor(config: FacteurConfiguration<KnownChannels>) {
    this.#options = new FacteurOptions(config)
  }

  defineMessage<Notifiable, Payload>(
    messageFactory: () => CreateMessageParams<Notifiable, KnownChannels, Payload>,
  ) {
    return new FacteurMessage(this.#options, messageFactory())
  }

  startWorker() {
    this.#options.queueAdapter.startQueueProcessor()
  }

  disconnect() {
    this.#options.queueAdapter.disconnect()
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

  async send<Message extends Notification<any>>(options: { message: Message }) {
    const channels = this.#pickChannelsToUse(options)
  }
}
