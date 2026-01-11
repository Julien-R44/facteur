import type {
  Channel,
  ChannelName,
  Notification,
  MessageCtx,
  NotificationSendResult,
  ChannelSendResult,
  Emitter,
  RetryConfig,
  RetryOptions,
  ChannelSendParams,
  BatchSendResult,
  InternalSendOptions,
} from '../types/index.js'
import type { Identifier } from '../database/types.js'

import { backoff, Tenace } from '@julr/tenace'

import { ChannelResolver, type ResolvedChannel } from './channel_resolver.js'
import { capitalizeFirstLetter } from '../helpers.js'
import { facteurEvents } from '../events/events.js'
import { errors } from '../errors/index.js'
import { chunk } from '../utils/chunk.js'
import debug from '../debug.js'

export interface PreparedMessage {
  channelName: string
  notification: Notification<any, any>
  messageContent: any
  sendParams: ChannelSendParams<any, any>
}

interface BuildMessageContentOptions {
  notification: Notification<any, any>
  channelName: ChannelName
  sendOptions: InternalSendOptions
}

interface MessageContentResult {
  content: any
  capitalizedChannelName: string
}

/**
 * Responsible for sending notifications and messages
 */
export class NotificationSender {
  constructor(
    private channels: Record<string, Channel>,
    private channelResolver: ChannelResolver,
    private emitter: Emitter,
    private retryConfig: RetryConfig = {},
  ) {}

  /**
   * Build the message content by calling the notification's `as<ChannelName>Message` method
   */
  #buildMessageContent(options: BuildMessageContentOptions): MessageContentResult | null {
    const { notification, channelName, sendOptions } = options
    const capitalizedChannelName = capitalizeFirstLetter(channelName as string)
    const channelMethodName = `as${capitalizedChannelName}Message` as const
    const messageBuilder = (notification as any)[channelMethodName]

    if (typeof messageBuilder !== 'function') {
      throw new errors.E_MISSING_MESSAGE_METHOD([capitalizedChannelName])
    }

    const content = messageBuilder.call(notification, {
      to: sendOptions.to,
      params: sendOptions.params,
      tenantId: sendOptions.tenantId,
    } as MessageCtx<any, any>)

    if (!content) return null

    return { content, capitalizedChannelName }
  }

  /**
   * Execute a function with retry/timeout if configured
   */
  async #executeWithRetry(fn: () => Promise<void>, options: RetryOptions): Promise<void> {
    const hasRetry = options.retries !== undefined || options.timeout !== undefined
    if (!hasRetry) return fn()

    let builder = Tenace.call(fn)

    // Order matters: timeout INNER (first), retry OUTER (second) = timeout per attempt
    if (options.timeout !== undefined) {
      builder = builder.withTimeout(options.timeout, 'aggressive')
    }

    if (options.retries !== undefined && options.retries > 0) {
      builder = builder.withRetry({
        times: options.retries,
        delay: backoff.exponentialWithJitter({ initial: 100, max: 5000 }),
      })
    }

    await builder.execute()
  }

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
  #emitMessageSending(notification: Notification<any, any>, channelName: ChannelName, message: any) {
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
   * Get a channel by its name, throws if not registered
   */
  #getChannel(channelName: ChannelName): Channel {
    const channel = this.channels[channelName as string]
    if (!channel) throw new Error(`Channel '${channelName as string}' is not registered`)

    return channel
  }

  /**
   * Resolve retry options for a specific channel.
   * Priority: send options > channel config > global config
   */
  #resolveRetryOptions(channelName: string, sendOptions: InternalSendOptions): RetryOptions {
    const globalConfig = this.retryConfig
    const channelConfig = globalConfig.channels?.[channelName as keyof typeof globalConfig.channels]

    const retries = sendOptions.retries ?? channelConfig?.retries ?? globalConfig.retries
    const timeout = sendOptions.timeout ?? channelConfig?.timeout ?? globalConfig.timeout

    return {
      ...(retries !== undefined && { retries }),
      ...(timeout !== undefined && { timeout }),
    }
  }

  /**
   * Send a single message through a specific channel
   */
  async #sendMessage(options: {
    notification: Notification<any, any>
    channelName: ChannelName
    options: InternalSendOptions
    channelConfig: ResolvedChannel
  }): Promise<ChannelSendResult | null> {
    const { notification, channelName, options: sendOptions, channelConfig } = options

    const channel = this.#getChannel(channelName)
    const messageResult = this.#buildMessageContent({ notification, channelName, sendOptions })
    if (!messageResult) return null

    const { content: messageContent } = messageResult

    debug(`Sending message via ${channelName}: %O`, messageContent)
    this.#emitMessageSending(notification, channelName, messageContent)

    const retryOptions = this.#resolveRetryOptions(channelName as string, sendOptions)
    const doSend = async () => {
      await channel.send({
        tenantId: sendOptions.tenantId,
        message: messageContent,
        targets: channelConfig.target,
        to: sendOptions.to,
      })
    }

    try {
      await this.#executeWithRetry(doSend, retryOptions)

      debug(`Message sent via ${channelName}`)
      this.#emitMessageSent(notification, channelName, messageContent)

      return { channel: channelName as never, status: 'success' }
    } catch (error) {
      this.#emitMessageFailed(notification, channelName, messageContent, error as Error)
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

    if (!failures.length) {
      this.#emitNotificationSent(notification, channelResults)
      await notification.afterSend()

      return { failed: failures.length, success: successes.length, results: channelResults }
    }

    const failureReasons = failures.map((r) => r.error)
    this.#emitNotificationFailed(notification, failureReasons)
    await notification.afterSend()

    if (throwOnError !== false) throw new errors.E_SEND_NOTIFICATION_FAILED(failureReasons)

    return { failed: failures.length, success: successes.length, results: channelResults }
  }

  /**
   * Send messages using the channel's batch API
   */
  async #sendWithBatchApi(
    channelName: ChannelName,
    channel: Channel,
    messages: PreparedMessage[],
  ): Promise<ChannelSendResult[]> {
    const maxSize = channel.batchConfig?.maxSize ?? 100
    const batches = chunk(messages, maxSize)
    const allResults: ChannelSendResult[] = []

    for (const batch of batches) {
      debug(`Sending batch of ${batch.length} messages via ${channelName}`)

      for (const msg of batch) {
        this.#emitMessageSending(msg.notification, channelName, msg.messageContent)
      }

      try {
        const batchResult: BatchSendResult = await channel.sendBatch!(batch.map((m) => m.sendParams))

        for (const result of batchResult.results) {
          const msg = batch[result.index]!

          if (result.status === 'success') {
            this.#emitMessageSent(msg.notification, channelName, msg.messageContent)
          } else {
            this.#emitMessageFailed(
              msg.notification,
              channelName,
              msg.messageContent,
              result.error || new Error('Unknown batch error'),
            )
          }

          allResults.push({
            channel: channelName,
            status: result.status,
            error: result.error,
          })
        }
      } catch (error) {
        for (const msg of batch) {
          this.#emitMessageFailed(msg.notification, channelName, msg.messageContent, error as Error)
          allResults.push({ channel: channelName, status: 'failed', error: error as Error })
        }
      }
    }

    return allResults
  }

  /**
   * Send messages individually when batch API is not available
   */
  async #sendIndividually(
    channelName: ChannelName,
    channel: Channel,
    messages: PreparedMessage[],
    sendOptions: InternalSendOptions,
  ): Promise<ChannelSendResult[]> {
    const retryOptions = this.#resolveRetryOptions(channelName as string, sendOptions)
    const results: ChannelSendResult[] = []

    for (const msg of messages) {
      debug(`Sending message via ${channelName}: %O`, msg.messageContent)
      this.#emitMessageSending(msg.notification, channelName, msg.messageContent)

      try {
        await this.#executeWithRetry(() => channel.send(msg.sendParams), retryOptions)

        debug(`Message sent via ${channelName}`)
        this.#emitMessageSent(msg.notification, channelName, msg.messageContent)
        results.push({ channel: channelName, status: 'success' })
      } catch (error) {
        this.#emitMessageFailed(msg.notification, channelName, msg.messageContent, error as Error)
        results.push({ channel: channelName, status: 'failed', error: error as Error })
      }
    }

    return results
  }

  /**
   * Send a notification through all resolved channels
   */
  async send(
    options: InternalSendOptions,
    notification: Notification<any, any>,
  ): Promise<NotificationSendResult> {
    const { via, params, tenantId, to } = options

    const resolvedChannels = await this.channelResolver.resolveChannels({
      to: to as any,
      params,
      tenantId: tenantId as Identifier,
      notification: options.notification,
      ...(via ? { via } : {}),
    })

    debug(`Resolved channels: %O`, resolvedChannels)
    this.#emitNotificationSending(notification, resolvedChannels)

    const promises = Object.entries(resolvedChannels).map(async ([name, config]) => {
      if (!config.shouldSend || !config.target) return null

      return await this.#sendMessage({
        notification,
        channelConfig: config,
        channelName: name as ChannelName,
        options,
      }).catch((error) => {
        debug(`Failed to send notification via ${name}: %O`, error)

        return { channel: name, status: 'failed' as const, error } as ChannelSendResult
      })
    })

    return await this.#processResults({
      notification,
      results: await Promise.all(promises),
      throwOnError: options.throwOnError !== false,
    })
  }

  /**
   * Prepare a message for a specific channel without sending it.
   * Returns null if the message should not be sent.
   */
  prepareMessage(options: {
    notification: Notification<any, any>
    channelName: ChannelName
    sendOptions: InternalSendOptions
    channelConfig: ResolvedChannel
  }): PreparedMessage | null {
    const { notification, channelName, sendOptions, channelConfig } = options

    this.#getChannel(channelName)

    const messageResult = this.#buildMessageContent({ notification, channelName, sendOptions })
    if (!messageResult) return null

    const { content: messageContent } = messageResult

    return {
      channelName: channelName as string,
      notification,
      messageContent,
      sendParams: {
        tenantId: sendOptions.tenantId,
        message: messageContent,
        targets: channelConfig.target,
        to: sendOptions.to,
      },
    }
  }

  /**
   * Send multiple messages through a channel using batch API if available.
   * Falls back to individual sends if batch is not supported.
   */
  async sendChannelBatch(options: {
    channelName: ChannelName
    messages: PreparedMessage[]
    sendOptions: InternalSendOptions
  }): Promise<ChannelSendResult[]> {
    const { channelName, messages, sendOptions } = options
    const channel = this.#getChannel(channelName)
    const disableDriverBatch = sendOptions.disableDriverBatch === true

    if (channel.sendBatch && channel.batchConfig?.enabled !== false && !disableDriverBatch) {
      return this.#sendWithBatchApi(channelName, channel, messages)
    }

    return this.#sendIndividually(channelName, channel, messages, sendOptions)
  }

  /**
   * Check if a channel supports batch sending
   */
  channelSupportsBatch(channelName: string): boolean {
    const ch = this.channels[channelName]

    return !!(ch?.sendBatch && ch.batchConfig?.enabled !== false)
  }

  /**
   * Get the batch config for a channel
   */
  getChannelBatchConfig(channelName: string) {
    return this.channels[channelName]?.batchConfig
  }
}
