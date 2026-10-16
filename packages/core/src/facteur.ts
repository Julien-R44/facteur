import type {
  FacteurConfiguration,
  Channel,
  NotificationSendResult,
  NotificationClass,
  Notification,
} from './types/index.ts'
import type { BuilderOptions, NotificationBuilder } from './types/builder.ts'
import type { DatabaseAdapter } from './database/types.ts'

import { collect, isAsyncIterable } from './utils/chunk.ts'
import { FacteurOptions } from './options.ts'
import { OrchestrationSender } from './notifications/orchestration_sender.ts'
import { NotificationSender } from './notifications/notification_sender.ts'
import { NotificationDiscoverer } from './notifications/notification_discoverer.ts'
import { createNotificationBuilder } from './notifications/notification_builder.ts'
import { ChannelResolver } from './notifications/channel_resolver.ts'
import { BatchingSender } from './notifications/batching_sender.ts'
import { FacteurFake } from './fake.ts'
import { FacteurDatabase } from './database/database.ts'

export function createFacteur<
  T extends Record<string, Channel>,
  DBAdapter extends DatabaseAdapter | null = null,
>(config: FacteurConfiguration<T, DBAdapter>) {
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
      channelResolver = new ChannelResolver(this.#db, this.#options.defaultPreferences)
    } else {
      channelResolver = new ChannelResolver(undefined, this.#options.defaultPreferences)
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
   * Single send path: anonymous sends, one recipient and many recipients all go
   * through the same per-recipient pipeline
   */
  async #send(options: BuilderOptions<any>): Promise<NotificationSendResult> {
    const isAnonymous = Boolean(options.via && !options.to)
    const recipients = isAnonymous ? [undefined] : await this.#resolveRecipients(options.to)
    if (recipients.length === 0) return { success: 0, failed: 0, results: [] }

    // `continueOnError()` returns channel failures instead of throwing, unless
    // `throwOnError()` is set explicitly
    const builderOptions = {
      ...options,
      throwOnError: options.throwOnError ?? !options.continueOnError,
    }

    if (this.#fake) return this.#recordFake(builderOptions, recipients, isAnonymous)

    const input = {
      recipients,
      builderOptions,
      prepareNotification: this.#prepareNotification.bind(this),
    }

    if (options.useDriverBatching) return this.#batchingSender.send(input)
    return this.#orchestrationSender.send(input)
  }

  /**
   * Fake mode: recipient sends are recorded directly, anonymous sends still run
   * preparation and `shouldSend()` first
   */
  async #recordFake(
    options: BuilderOptions<any>,
    recipients: unknown[],
    isAnonymous: boolean,
  ): Promise<NotificationSendResult> {
    if (isAnonymous) {
      try {
        const { shouldSkip } = await this.#prepareNotification(undefined, options)
        if (shouldSkip) return { success: 0, failed: 0, results: [] }
        return this.#fake!.recordSent(options)
      } catch (error) {
        if (!options.continueOnError || options.throwOnError) throw error
        return { success: 0, failed: 1, results: [] }
      }
    }

    for (const recipient of recipients) this.#fake!.recordSent({ ...options, to: recipient })
    return { success: recipients.length, failed: 0, results: [] }
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
      getNotificationIdentities: () => this.#discoverer.getNotificationIdentities(),
      getNotificationTags: () => this.#discoverer.getAllNotificationTags(),
      clearCache: () => this.#discoverer.clearCache(),
    }
  }

  /**
   * Enable fake mode for testing - captures sent notifications instead of sending
   */
  fake(): FacteurFake {
    this.#fake = new FacteurFake(() => this.restore())

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
