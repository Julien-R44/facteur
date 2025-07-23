import { capitalize } from '@julr/utils/string'

import debug from './debug.js'
import { FacteurOptions } from './options.js'
import { FacteurDatabase } from './database/database.js'
import type { DatabaseAdapter } from './database/types.js'
import { NotificationDiscoverer } from './notification_discoverer.js'
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

export class Facteur<
  KnownChannels extends Record<string, Channel>,
  DBAdapter extends DatabaseAdapter | null = null,
> {
  #options: FacteurOptions<KnownChannels, DBAdapter>
  #db: FacteurDatabase | null = null
  #discoverer: NotificationDiscoverer

  constructor(config: FacteurConfiguration<KnownChannels, DBAdapter>) {
    this.#options = new FacteurOptions(config)
    this.#discoverer = new NotificationDiscoverer({
      searchDirectory: config.discoverer.searchDirectory,
      fileSuffix: config.discoverer.fileSuffix,
    })

    if (this.#options.databaseAdapter) {
      const options = this.#options as FacteurOptions<KnownChannels, DatabaseAdapter>
      this.#db = new FacteurDatabase(options)
    }
  }

  get db(): DBAdapter extends DatabaseAdapter ? FacteurDatabase : never {
    if (!this.#options.databaseAdapter) {
      throw new Error('No database adapter configured')
    }

    return this.#db as any
  }

  get discoverer() {
    return {
      discoverAndLoadNotifications: () => this.#discoverer.discoverAndLoadNotifications(),
      clearCache: () => this.#discoverer.clearCache(),
    }
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

    debug(
      `Sending notification via channels [%s]: %O`,
      Array.from(activeChannels).join(', '),
      resolvedTargets,
    )

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
