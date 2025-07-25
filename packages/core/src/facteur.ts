import { capitalize } from '@julr/utils/string'

import debug from './debug.js'
import { FacteurFake } from './fake.js'
import { FacteurOptions } from './options.js'
import { FacteurDatabase } from './database/database.js'
import { ChannelResolver, type ResolveChannelsOptions } from './channel_resolver.js'
import type { DatabaseAdapter, Identifier } from './database/types.js'
import { NotificationDiscoverer } from './notification_discoverer.js'
import type {
  FacteurConfiguration,
  Channel,
  SendOptions,
  ChannelName,
  Notification,
  MessageCtx,
} from './types.js'

export function createFacteur<T extends Record<string, Channel>>(config: FacteurConfiguration<T>) {
  return new Facteur(config)
}

export class Facteur<
  KnownChannels extends Record<string, Channel>,
  DBAdapter extends DatabaseAdapter | null = null,
> {
  #fake: FacteurFake | null = null
  #db: FacteurDatabase | null = null
  #discoverer: NotificationDiscoverer
  #options: FacteurOptions<KnownChannels, DBAdapter>
  #channelResolver: ChannelResolver

  constructor(config: FacteurConfiguration<KnownChannels, DBAdapter>) {
    this.#options = new FacteurOptions(config)
    this.#discoverer = new NotificationDiscoverer({
      searchDirectory: config.discoverer.searchDirectory,
      fileSuffix: config.discoverer.fileSuffix,
    })

    if (this.#options.databaseAdapter) {
      const options = this.#options as FacteurOptions<KnownChannels, DatabaseAdapter>
      this.#db = new FacteurDatabase(options, this.#discoverer)
      this.#channelResolver = new ChannelResolver(this.#db)
    } else {
      this.#channelResolver = new ChannelResolver()
    }
  }

  get channelResolver() {
    return this.#channelResolver
  }

  get db(): DBAdapter extends DatabaseAdapter ? FacteurDatabase : never {
    if (!this.#options.databaseAdapter) {
      throw new Error('No database adapter configured')
    }

    return this.#db as any
  }

  get discoverer() {
    return {
      discoverNotifications: () => this.#discoverer.discoverNotifications(),
      getNotifications: () => this.#discoverer.getNotifications(),
      getNotificationTags: () => this.#discoverer.getAllNotificationTags(),
      clearCache: () => this.#discoverer.clearCache(),
    }
  }

  #getProvider(channelName: ChannelName): Channel {
    const channel = this.#options.channels[channelName as string]
    if (!channel) throw new Error(`Channel '${channelName as string}' is not registered`)

    return channel
  }

  /**
   * Fake the notification sending process for testing purposes
   */
  fake(): FacteurFake {
    this.#fake = new FacteurFake()
    return this.#fake
  }

  /**
   * Restore the original notification sending process after faking it
   */
  restore() {
    this.#fake = null
  }

  async send<N extends Notification>(options: SendOptions<N>) {
    if (this.#fake) return this.#fake.recordSent(options)

    const { notifiable, via, params, tenantId } = options

    const notification = new options.notification()
    const resolveOptions: ResolveChannelsOptions = {
      notification,
      notifiable,
      params,
      tenantId: tenantId as Identifier,
      ...(via ? { via } : {}),
    }

    const resolvedChannels = await this.#channelResolver.resolveChannels(resolveOptions)

    debug(`Resolved channels: %O`, resolvedChannels)

    const sendPromises = Object.entries(resolvedChannels).map(
      async ([channelName, channelConfig]) => {
        if (!channelConfig.shouldSend || !channelConfig.target) return

        const channel = this.#getProvider(channelName as ChannelName)
        const channelMethodName = `as${capitalize(channelName)}Message` as const
        const messageBuilder = notification[channelMethodName]

        if (typeof messageBuilder !== 'function') return

        const messageContent = notification[channelMethodName]({
          notifiable,
          params: options.params,
          tenantId: options.tenantId,
        } as MessageCtx<any, any>)

        if (!messageContent) return

        debug(`Sending message via ${channelName}: %O`, messageContent)

        await channel.send({
          tenantId: options.tenantId,
          message: messageContent,
          targets: channelConfig.target,
          notifiable,
        })

        debug(`Message sent via ${channelName}`)
      },
    )

    // TODO: settled ?
    await Promise.allSettled(sendPromises)
  }
}
