import { FacteurFake } from './fake.js'
import { FacteurOptions } from './options.js'
import { FacteurDatabase } from './database/database.js'
import { NotificationSender } from './notifications/notification_sender.js'
import { ChannelResolver } from './notifications/channel_resolver.js'
import type { DatabaseAdapter } from './database/types.js'
import { NotificationDiscoverer } from './notifications/notification_discoverer.js'
import {
  type FacteurConfiguration,
  type Channel,
  type SendOptions,
  type NotificationSendResult,
  type NotificationClass,
} from './types/index.js'

export function createFacteur<T extends Record<string, Channel>>(config: FacteurConfiguration<T>) {
  return new Facteur(config)
}

/**
 * Main manager class for Facteur library.
 */
export class Facteur<
  KnownChannels extends Record<string, Channel>,
  DBAdapter extends DatabaseAdapter | null = null,
> {
  #sender: NotificationSender
  #fake: FacteurFake | null = null
  #db: FacteurDatabase | null = null
  #discoverer: NotificationDiscoverer
  #channelResolver: ChannelResolver
  #options: FacteurOptions<KnownChannels, DBAdapter>

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

    this.#sender = new NotificationSender(
      this.#options.channels,
      this.#channelResolver,
      this.#options.emitter,
    )
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

  /**
   * Send a notification
   */
  async send<TNotificationClass extends NotificationClass<any, any>>(
    options: SendOptions<TNotificationClass>,
  ): Promise<NotificationSendResult> {
    const notification = await this.#options.notificationResolver(options.notification, {
      notifiable: 'notifiable' in options ? options.notifiable : undefined,
      params: options.params,
      tenantId: options.tenantId,
    })

    await notification.prepare()

    if (notification.shouldSend() === false) return { success: 0, failed: 0, results: [] }

    if (this.#fake) return this.#fake.recordSent(options as SendOptions<any>)

    return this.#sender.send(options, notification)
  }
}
