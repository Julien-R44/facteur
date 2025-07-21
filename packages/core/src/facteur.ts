import { capitalize } from '@julr/utils/string'

import { FacteurOptions } from './options.js'
import { FacteurMessage } from './message.js'
import type {
  FacteurConfiguration,
  CreateMessageParams,
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

  defineMessage<Notifiable, Payload = void>(
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

  #getProvider(channelName: ChannelName): Channel {
    const channel = this.#options.channels[channelName as string]
    if (!channel) {
      throw new Error(`Channel '${channelName as string}' is not registered`)
    }
    return channel
  }

  async send<N extends Notifiable>(options: SendOptions<N>) {
    const { message, notifiable, via: sendTimeChannelConfig } = options

    const suggestedChannels = message.via({ notifiable })
    const activeChannels = new Set<ChannelName>(suggestedChannels)

    // Step 2.3: Initialize Active Channels and Resolve Default Targets
    const resolvedTargets: Record<string, any> = {}
    const defaultTargetsFromNotifiable = notifiable.notificationTargets?.() ?? {}

    // Populate resolvedTargets with defaults
    for (const channelName of activeChannels) {
      if (defaultTargetsFromNotifiable[channelName]) {
        resolvedTargets[channelName] = defaultTargetsFromNotifiable[channelName]
      }
    }

    // Step 2.4: Apply Send-Time Channel Configuration
    if (sendTimeChannelConfig) {
      for (const [channelName, configValue] of Object.entries(sendTimeChannelConfig)) {
        const channel = channelName as ChannelName

        if (configValue === true) {
          // Add channel to active channels
          activeChannels.add(channel)
          // If no target exists and we have a default, use it
          if (!resolvedTargets[channel] && defaultTargetsFromNotifiable[channel]) {
            resolvedTargets[channel] = defaultTargetsFromNotifiable[channel]
          }
        } else if (configValue === false) {
          // Remove channel from active channels
          activeChannels.delete(channel)
          resolvedTargets[channel] = undefined
        } else if (configValue && typeof configValue === 'object') {
          // Set specific target
          activeChannels.add(channel)
          resolvedTargets[channel] = configValue
        }
      }
    }

    // Step 2.5: Dispatch Notifications
    for (const channelName of activeChannels) {
      const target = resolvedTargets[channelName]

      console.log(target)

      // Validation: skip if no target found
      if (!target) continue

      // Get the provider and dispatch
      const channel = this.#getProvider(channelName)

      const channelMethodName = `to${capitalize(channelName as string)}` as const
      // @ts-expect-error Dynamic method access
      const messageBuilder = message[channelMethodName]

      if (typeof messageBuilder === 'function') {
        const messageContent = messageBuilder({ notifiable })
        if (!messageContent) continue

        await channel.send({ message: messageContent, targets: target, notifiable })
      }
    }
  }
}
