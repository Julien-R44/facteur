import { capitalize } from '@julr/utils/string'

import debug from '../debug.js'
import { facteurEvents } from '../events/events.js'
import { ChannelResolver, type ResolvedChannel } from './channel_resolver.js'
import type { Identifier } from '../database/types.js'
import type {
  Channel,
  SendOptions,
  ChannelName,
  Notification,
  MessageCtx,
  NotificationSendResult,
  ChannelSendResult,
  Emitter,
} from '../types/index.js'
import { errors } from '../errors/index.js'

/**
 * Responsible for sending notifications and messages
 */
export class NotificationSender {
  constructor(
    private channels: Record<string, Channel>,
    private channelResolver: ChannelResolver,
    private emitter: Emitter,
  ) {}

  /**
   * Emit notification sending event
   */
  #emitNotificationSending(
    notification: Notification<any, any>,
    resolvedChannels: Record<string, any>,
  ) {
    const event = facteurEvents.notificationSending({ notification, resolvedChannels })
    this.emitter.emit(event.name, event.data)
  }

  /**
   * Emit notification sent event
   */
  #emitNotificationSent(notification: Notification<any, any>, results: ChannelSendResult[]) {
    const event = facteurEvents.notificationSent({ notification, results })
    this.emitter.emit(event.name, event.data)
  }

  /**
   * Emit notification failed event
   */
  #emitNotificationFailed(notification: Notification<any, any>, errors: Error[]) {
    const event = facteurEvents.notificationFailed({ notification, errors })
    this.emitter.emit(event.name, event.data)
  }

  /**
   * Emit message sending event
   */
  #emitMessageSending(
    notification: Notification<any, any>,
    channelName: ChannelName,
    message: any,
  ) {
    const event = facteurEvents.messageSending({ notification, channelName, message })
    this.emitter.emit(event.name, event.data)
  }

  /**
   * Emit message sent event
   */
  #emitMessageSent(notification: Notification<any, any>, channelName: ChannelName, message: any) {
    const event = facteurEvents.messageSent({ notification, channelName, message })
    this.emitter.emit(event.name, event.data)
  }

  /**
   * Emit message failed event
   */
  #emitMessageFailed(
    notification: Notification<any, any>,
    channelName: ChannelName,
    message: any,
    error: Error,
  ) {
    const event = facteurEvents.messageFailed({ notification, channelName, message, error })
    this.emitter.emit(event.name, event.data)
  }

  /**
   * Get a channel by its name
   */
  #getChannel(channelName: ChannelName): Channel {
    const channel = this.channels[channelName as string]
    if (!channel) throw new Error(`Channel '${channelName as string}' is not registered`)

    return channel
  }

  /**
   * Send a single message through a specific channel
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
    const channel = this.#getChannel(channelName as ChannelName)
    const channelMethodName = `as${capitalize(channelName)}Message` as const
    const messageBuilder = (options.notification as any)[channelMethodName]

    if (typeof messageBuilder !== 'function') {
      throw new errors.E_MISSING_MESSAGE_METHOD([capitalize(channelName)])
    }

    const messageContent = messageBuilder.call(options.notification, {
      notifiable: sendOptions.notifiable,
      params: sendOptions.params,
      tenantId: sendOptions.tenantId,
    } as MessageCtx<any, any>)

    if (!messageContent) return null

    /**
     * Send the message and emit appropriate events
     */
    debug(`Sending message via ${channelName}: %O`, messageContent)

    this.#emitMessageSending(options.notification, channelName, messageContent)

    try {
      await channel.send({
        tenantId: sendOptions.tenantId,
        message: messageContent,
        targets: channelConfig.target,
        notifiable: sendOptions.notifiable,
      })

      debug(`Message sent via ${channelName}`)
      this.#emitMessageSent(options.notification, channelName, messageContent)
      return { channel: channelName as never, status: 'success' }
    } catch (error) {
      this.#emitMessageFailed(options.notification, channelName, messageContent, error as Error)
      throw error
    }
  }

  /**
   * Process results from sending messages and emit appropriate events
   */
  async #processResults(options: {
    results: Array<ChannelSendResult | null>
    throwOnError: boolean
    notification: Notification<any, any>
  }) {
    const { results, throwOnError, notification } = options

    const channelResults = results.filter((result): result is ChannelSendResult => result !== null)
    const successes = channelResults.filter((r) => r.status === 'success')
    const failures = channelResults.filter((r) => r.status === 'failed')

    /**
     * Everything succeeded
     */
    if (!failures.length) {
      this.#emitNotificationSent(notification, channelResults)
      return { failed: failures.length, success: successes.length, results: channelResults }
    }

    /**
     * Some channels failed
     */
    const failureReasons = failures.map((r) => r.error)
    this.#emitNotificationFailed(notification, failureReasons)

    if (throwOnError !== false) throw new errors.E_SEND_NOTIFICATION_FAILED(failureReasons)

    return { failed: failures.length, success: successes.length, results: channelResults }
  }

  /**
   * Send a notification through all resolved channels
   */
  async send<N extends Notification>(
    options: SendOptions<any, N>,
  ): Promise<NotificationSendResult> {
    const { notifiable, via, params, tenantId } = options
    const resolvedChannels = await this.channelResolver.resolveChannels({
      notifiable,
      params,
      tenantId: tenantId as Identifier,
      notification: options.notification,
      ...(via ? { via } : {}),
    })

    debug(`Resolved channels: %O`, resolvedChannels)
    const notification = new options.notification()
    this.#emitNotificationSending(notification, resolvedChannels)

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
        return { channel: name, status: 'failed' as const, error } as ChannelSendResult
      })
    })

    /**
     * Process results and emit appropriate events
     */
    return await this.#processResults({
      notification,
      results: await Promise.all(promises),
      throwOnError: options.throwOnError !== false,
    })
  }
}
