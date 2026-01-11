import type { DatabaseAdapter } from './database/types.js'

import type {
  FacteurConfiguration,
  Channel,
  NotificationSendResult,
  NotificationClass,
  Notification,
} from './types/index.js'
import type { BuilderOptions, NotificationBuilder } from './types/builder.js'
import { collect, isAsyncIterable } from './utils/chunk.js'
import { FacteurOptions } from './options.js'
import { NotificationSender } from './notifications/notification_sender.js'
import { NotificationDiscoverer } from './notifications/notification_discoverer.js'
import { ChannelResolver } from './notifications/channel_resolver.js'
import { FacteurFake } from './fake.js'
import { FacteurDatabase } from './database/database.js'
import { createNotificationBuilder } from './notifications/notification_builder.js'
import { OrchestrationSender } from './notifications/orchestration_sender.js'
import { BatchingSender } from './notifications/batching_sender.js'

export function createFacteur<T extends Record<string, Channel>>(config: FacteurConfiguration<T>) {
  return new Facteur(config)
}

export class Facteur<
  KnownChannels extends Record<string, Channel>,
  DBAdapter extends DatabaseAdapter | null = null,
> {
  #sender: NotificationSender
  #orchestrationSender: OrchestrationSender
  #batchingSender: BatchingSender
  #fake: FacteurFake | null = null
  #db: FacteurDatabase | null = null
  #discoverer: NotificationDiscoverer
  #options: FacteurOptions<KnownChannels, DBAdapter>

  constructor(config: FacteurConfiguration<KnownChannels, DBAdapter>) {
    this.#options = new FacteurOptions(config)
    this.#discoverer = new NotificationDiscoverer({
      searchDirectory: config.discoverer.searchDirectory,
      fileSuffix: config.discoverer.fileSuffix,
    })

    let channelResolver: ChannelResolver
    if (this.#options.databaseAdapter) {
      const options = this.#options as FacteurOptions<KnownChannels, DatabaseAdapter>
      this.#db = new FacteurDatabase(options, this.#discoverer)
      channelResolver = new ChannelResolver(this.#db)
    } else {
      channelResolver = new ChannelResolver()
    }

    this.#sender = new NotificationSender(
      this.#options.channels,
      channelResolver,
      this.#options.emitter,
      this.#options.retry,
    )

    this.#orchestrationSender = new OrchestrationSender(this.#sender)
    this.#batchingSender = new BatchingSender(this.#sender, channelResolver)
  }

  /**
   * Converts recipients input to an array, handling single values, arrays, and async iterables
   */
  async #resolveRecipients(to: unknown): Promise<unknown[]> {
    if (!to) return []
    if (Array.isArray(to)) return to
    if (isAsyncIterable(to)) return collect(to)

    return [to]
  }

  /**
   * Resolves notification instance and runs lifecycle hooks
   */
  async #prepareNotification(
    recipient: unknown,
    options: BuilderOptions<any>,
  ): Promise<{ notification: Notification<any, any>; shouldSkip: boolean }> {
    const notification = await this.#options.notificationResolver(options.notification, {
      to: recipient,
      params: options.params,
      tenantId: options.tenantId,
    })

    await notification.beforeSend()
    const shouldSkip = (await notification.shouldSend()) === false

    return { notification, shouldSkip }
  }

  /**
   * Handles anonymous sends (via without to) - e.g., sending to a fixed webhook
   */
  async #sendAnonymous(options: BuilderOptions<any>): Promise<NotificationSendResult> {
    const { notification, shouldSkip } = await this.#prepareNotification(undefined, options)
    if (shouldSkip) return { success: 0, failed: 0, results: [] }
    if (this.#fake) return this.#fake.recordSent(options)

    return this.#sender.send(options, notification)
  }

  /**
   * Main send entry point - unified handling for all recipient types
   */
  async #send(options: BuilderOptions<any>): Promise<NotificationSendResult> {
    if (options.via && !options.to) return this.#sendAnonymous(options)

    const recipients = await this.#resolveRecipients(options.to)
    if (recipients.length === 0) return { success: 0, failed: 0, results: [] }

    // Fake mode - early return for all recipients
    if (this.#fake) {
      for (const recipient of recipients) this.#fake.recordSent({ ...options, to: recipient })
      return { success: recipients.length, failed: 0, results: [] }
    }

    // Single recipient: fast path that preserves per-send retry options
    if (recipients.length === 1) return this.#sendSingle({ ...options, to: recipients[0] })

    const prepareNotification = this.#prepareNotification.bind(this)

    if (options.useDriverBatching) {
      return this.#batchingSender.send({
        recipients,
        builderOptions: options,
        prepareNotification,
      })
    }

    return this.#orchestrationSender.send({
      recipients,
      builderOptions: options,
      prepareNotification,
    })
  }

  /**
   * Fast path for single recipient - passes options directly to sender
   */
  async #sendSingle(options: BuilderOptions<any>): Promise<NotificationSendResult> {
    const { notification, shouldSkip } = await this.#prepareNotification(options.to, options)
    if (shouldSkip) return { success: 0, failed: 0, results: [] }

    return this.#sender.send(options, notification)
  }

  /**
   * Access the database layer for in-app notifications and preferences
   */
  get db(): DBAdapter extends DatabaseAdapter ? FacteurDatabase : never {
    if (!this.#options.databaseAdapter) throw new Error('No database adapter configured')

    return this.#db as DBAdapter extends DatabaseAdapter ? FacteurDatabase : never
  }

  /**
   * Access notification discovery utilities for finding and managing notifications
   */
  get discoverer() {
    return {
      discoverNotifications: () => this.#discoverer.discoverNotifications(),
      getNotifications: () => this.#discoverer.getNotifications(),
      getNotificationTags: () => this.#discoverer.getAllNotificationTags(),
      clearCache: () => this.#discoverer.clearCache(),
    }
  }

  /**
   * Enable fake mode for testing - captures sent notifications instead of sending
   */
  fake(): FacteurFake {
    this.#fake = new FacteurFake()

    return this.#fake
  }

  /**
   * Restore normal sending behavior after fake mode
   */
  restore() {
    this.#fake = null
  }

  /**
   * Create a notification builder for fluent API
   */
  notification<TNotification extends NotificationClass<any, any>>(
    notificationClass: TNotification,
  ): NotificationBuilder<TNotification, { hasParams: false; hasTo: false; hasVia: false }> {
    return createNotificationBuilder((options) => this.#send(options), notificationClass)
  }
}
