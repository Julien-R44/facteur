import { capitalize } from '@julr/utils/string'

import debug from './debug.js'
import { FacteurFake } from './fake.js'
import { FacteurOptions } from './options.js'
import { FacteurDatabase } from './database/database.js'
import { ChannelResolver, type ResolvedChannel } from './channel_resolver.js'
import type { DatabaseAdapter, Identifier } from './database/types.js'
import { NotificationDiscoverer } from './notification_discoverer.js'
import { facteurEvents } from './events/events.js'
import type {
  FacteurConfiguration,
  Channel,
  SendOptions,
  ChannelName,
  Notification,
  MessageCtx,
  NotificationSendResult,
  ChannelSendResult,
} from './types.js'
import { errors } from './errors/index.js'

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

  /**
   * Send a single message
   */
  async #sendMessage(options: {
    notification: Notification<any, any>
    channelName: ChannelName
    options: SendOptions<any, any>
    channelConfig: ResolvedChannel
  }): Promise<ChannelSendResult | null> {
    const { channelName, options: sendOptions, channelConfig } = options

    /**
     * First build the message content using the notification's
     * `as<ChannelName>Message` method
     */
    const channel = this.#getProvider(channelName as ChannelName)
    const channelMethodName = `as${capitalize(channelName)}Message` as const
    const messageBuilder = (options.notification as any)[channelMethodName]

    if (typeof messageBuilder !== 'function') {
      throw new errors.E_MISSING_MESSAGE_METHOD([capitalize(channelName)])
    }

    const messageContent = messageBuilder({
      notifiable: sendOptions.notifiable,
      params: sendOptions.params,
      tenantId: sendOptions.tenantId,
    } as MessageCtx<any, any>)

    if (!messageContent) return null

    /**
     * Then send it
     */
    debug(`Sending message via ${channelName}: %O`, messageContent)
    const sendingEvent = facteurEvents.messageSending({
      channelName,
      sendOptions,
      message: messageContent,
      notification: options.notification,
    })

    this.#options.emitter.emit(sendingEvent.name, sendingEvent.data)

    try {
      await channel.send({
        tenantId: sendOptions.tenantId,
        message: messageContent,
        targets: channelConfig.target,
        notifiable: sendOptions.notifiable,
      })

      debug(`Message sent via ${channelName}`)

      // Emit sent event
      const sentEvent = facteurEvents.messageSent({
        notification: options.notification,
        channelName,
        message: messageContent,
        sendOptions,
      })
      this.#options.emitter.emit(sentEvent.name, sentEvent.data)

      return { channel: channelName as never, status: 'success' }
    } catch (error) {
      // Emit failed event
      const failedEvent = facteurEvents.messageFailed({
        notification: options.notification,
        channelName,
        message: messageContent,
        sendOptions,
        error: error as Error,
      })
      this.#options.emitter.emit(failedEvent.name, failedEvent.data)

      throw error
    }
  }

  /**
   * Send a notification
   */
  async send<N extends Notification>(
    options: SendOptions<any, N>,
  ): Promise<NotificationSendResult> {
    const { notifiable, via, params, tenantId } = options

    if (this.#fake) return this.#fake.recordSent(options)

    const resolvedChannels = await this.#channelResolver.resolveChannels({
      notification: options.notification,
      notifiable,
      params,
      tenantId: tenantId as Identifier,
      ...(via ? { via } : {}),
    })

    debug(`Resolved channels: %O`, resolvedChannels)

    const notification = new options.notification()

    // Emit notification sending event
    const sendingEvent = facteurEvents.notificationSending({
      notification,
      sendOptions: options,
      resolvedChannels,
    })
    this.#options.emitter.emit(sendingEvent.name, sendingEvent.data)

    /**
     * Send messages for each resolved channel
     */
    const promises = Object.entries(resolvedChannels).map(async ([name, config]) => {
      if (!config.shouldSend || !config.target) return null

      return await this.#sendMessage({
        options,
        notification,
        channelConfig: config,
        channelName: name as ChannelName,
      }).catch((error) => {
        debug(`Failed to send notification via ${name}: %O`, error)
        return { channel: name, status: 'failed' as const, error }
      })
    })

    /**
     * Then create a result object with the results of each channel
     */
    const results = await Promise.all(promises)
    const channelResults = results.filter((result): result is ChannelSendResult => result !== null)
    const successes = channelResults.filter((r) => r.status === 'success')
    const failures = channelResults.filter((r) => r.status === 'failed')

    if (failures.length > 0) {
      const failedEvent = facteurEvents.notificationFailed({
        notification,
        sendOptions: options,
        errors: failures.map((r) => r.error),
      })
      this.#options.emitter.emit(failedEvent.name, failedEvent.data)

      if (options.throwOnError !== false) {
        throw new errors.E_SEND_NOTIFICATION_FAILED(failures.map((r) => r.error))
      }
    } else {
      const sentEvent = facteurEvents.notificationSent({
        notification,
        sendOptions: options,
        results: channelResults,
      })
      this.#options.emitter.emit(sentEvent.name, sentEvent.data)
    }

    return { failed: failures.length, success: successes.length, results: channelResults }
  }
}
