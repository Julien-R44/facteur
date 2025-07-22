import { capitalize } from '@julr/utils/string'

import { FacteurOptions } from './options.js'
import type {
  FacteurConfiguration,
  Channel,
  SendOptions,
  ChannelName,
  Notifiable,
} from './types.js'

export function createFacteur<T extends Record<string, Channel>>(config: FacteurConfiguration<T>) {
  return new Facteur(config)
}

export class Facteur<KnownChannels extends Record<string, Channel>> {
  #options: FacteurOptions<KnownChannels>

  constructor(config: FacteurConfiguration<KnownChannels>) {
    this.#options = new FacteurOptions(config)
  }

  startWorker() {
    this.#options.queueAdapter.startQueueProcessor()
  }

  disconnect() {
    this.#options.queueAdapter.disconnect()
  }

  #getProvider(channelName: ChannelName): Channel {
    const channel = this.#options.channels[channelName as string]
    if (!channel) {
      throw new Error(`Channel '${channelName as string}' is not registered`)
    }
    return channel
  }

  async send<N extends Notifiable>(options: SendOptions<N>) {
    const { notifiable, via: sendTimeChannelConfig } = options

    const notification = new options.notification()
    const suggestedChannels = notification.via?.({ notifiable })
    const activeChannels = new Set<ChannelName>(suggestedChannels)

    const resolvedTargets: Record<string, any> = {}
    const defaultTargetsFromNotifiable = notifiable.notificationTargets?.() ?? {}

    for (const channelName of activeChannels) {
      if (defaultTargetsFromNotifiable[channelName]) {
        resolvedTargets[channelName] = defaultTargetsFromNotifiable[channelName]
      }
    }

    if (sendTimeChannelConfig) {
      for (const [channelName, configValue] of Object.entries(sendTimeChannelConfig)) {
        const channel = channelName as ChannelName

        if (configValue === true) {
          activeChannels.add(channel)
          if (!resolvedTargets[channel] && defaultTargetsFromNotifiable[channel]) {
            resolvedTargets[channel] = defaultTargetsFromNotifiable[channel]
          }
        } else if (configValue === false) {
          activeChannels.delete(channel)
          resolvedTargets[channel] = undefined
        } else if (configValue && typeof configValue === 'object') {
          activeChannels.add(channel)
          resolvedTargets[channel] = configValue
        }
      }
    }

    for (const channelName of activeChannels) {
      const target = resolvedTargets[channelName]
      if (!target) continue

      const channel = this.#getProvider(channelName)

      const channelMethodName = `as${capitalize(channelName as string)}Message` as const
      // @ts-expect-error Dynamic method access
      const messageBuilder = notification[channelMethodName]

      if (typeof messageBuilder === 'function') {
        const messageContent = messageBuilder({ notifiable })
        if (!messageContent) continue

        await channel.send({ message: messageContent, targets: target, notifiable })
      }
    }
  }
}
