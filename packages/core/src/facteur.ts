import type {
  FacteurConfiguration,
  Channel,
  NotificationSendResult,
  NotificationClass,
  Notification,
  ChannelSendResult,
} from './types/index.ts'
import type { BuilderOptions, NotificationBuilder } from './types/builder.ts'
import type { DatabaseAdapter } from './database/types.ts'
import type { NotificationJobPayload } from './types/queue.ts'

import { errors } from './errors/index.ts'

import { collect, isAsyncIterable } from './utils/chunk.ts'
import { FacteurOptions } from './options.ts'
import { OrchestrationSender } from './notifications/orchestration_sender.ts'
import { NotificationSender } from './notifications/notification_sender.ts'
import { NotificationDiscoverer } from './notifications/notification_discoverer.ts'
import { createNotificationBuilder } from './notifications/notification_builder.ts'
import { ChannelResolver, type ResolveChannelsOptions } from './notifications/channel_resolver.ts'
import { BatchingSender } from './notifications/batching_sender.ts'
import { FacteurFake } from './fake.ts'
import { FacteurDatabase } from './database/database.ts'

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
  #channelResolver: ChannelResolver
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

    if (this.#options.databaseAdapter) {
      const options = this.#options as FacteurOptions<KnownChannels, DatabaseAdapter>
      this.#db = new FacteurDatabase(options, this.#discoverer)
      this.#channelResolver = new ChannelResolver(this.#db, this.#options.defaultPreferences)
    } else {
      this.#channelResolver = new ChannelResolver(undefined, this.#options.defaultPreferences)
    }

    this.#sender = new NotificationSender(
      this.#options.channels,
      this.#channelResolver,
      this.#options.emitter,
      this.#options.retry,
    )

    this.#orchestrationSender = new OrchestrationSender(this.#sender)
    this.#batchingSender = new BatchingSender(this.#sender, this.#channelResolver)
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
   * Checks if queue mode should be used for this notification
   */
  #shouldUseQueue(options: BuilderOptions<any>): boolean {
    if (options.queueMode) return true

    const notifOptions = (options.notification as any).options
    return !!notifOptions?.queue
  }

  /**
   * Gets the queue options from notification class or builder options
   */
  #getQueueOptions(options: BuilderOptions<any>) {
    const notifOptions = (options.notification as any).options?.queue
    const builderOptions = options.queueOptions

    if (typeof notifOptions === 'object') {
      return { ...notifOptions, ...builderOptions }
    }

    return builderOptions
  }

  /**
   * Queues notifications for later processing. Creates one job per recipient × channel.
   */
  async #queueNotifications(options: BuilderOptions<any>): Promise<NotificationSendResult> {
    const recipients = await this.#resolveRecipients(options.to)
    if (recipients.length === 0) return { success: 0, failed: 0, results: [] }

    const queueOptions = this.#getQueueOptions(options)
    let queued = 0

    for (const recipient of recipients) {
      const { shouldSkip } = await this.#prepareNotification(recipient, options)
      if (shouldSkip) continue

      const notifOptions = (options.notification as any).options || {}
      const resolveOptions: ResolveChannelsOptions = {
        notification: options.notification,
        to: recipient as any,
        params: options.params,
      }
      if (options.via) resolveOptions.via = options.via
      if (options.tenantId !== undefined) resolveOptions.tenantId = options.tenantId

      const resolvedChannels = await this.#channelResolver.resolveChannels(resolveOptions)

      for (const [channelName, config] of Object.entries(resolvedChannels)) {
        if (!config.shouldSend) continue

        const payload: NotificationJobPayload = {
          notificationIdentifier: notifOptions.identifier || options.notification.name,
          params: options.params || {},
          recipientData: recipient as Record<string, any>,
          channelName,
          target: config.target,
        }

        if (options.tenantId !== undefined) payload.tenantId = options.tenantId

        await this.#options.queueAdapter.queue(payload, queueOptions)
        queued++
      }
    }

    return { success: queued, failed: 0, results: [] }
  }

  /**
   * Main send entry point - unified handling for all recipient types
   */
  async #send(options: BuilderOptions<any>): Promise<NotificationSendResult> {
    if (options.via && !options.to) return this.#sendAnonymous(options)

    // Check if we should queue instead of sending immediately
    if (this.#shouldUseQueue(options)) return this.#queueNotifications(options)

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

  /**
   * Send a message through a specific channel. Used by queue workers to send queued notifications.
   */
  async sendViaChannel(options: {
    channelName: string
    message: unknown
    target: unknown
    recipient?: unknown
    tenantId?: unknown
  }): Promise<ChannelSendResult> {
    const channel = this.#options.channels[options.channelName as keyof KnownChannels]
    if (!channel) throw new errors.E_CHANNEL_NOT_FOUND([options.channelName])

    await channel.send({
      message: options.message as any,
      targets: options.target as any,
      to: options.recipient as any,
      tenantId: options.tenantId as any,
    })

    return {
      channel: options.channelName,
      status: 'success',
    } as ChannelSendResult
  }
}
