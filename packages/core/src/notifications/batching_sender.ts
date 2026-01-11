import type { Duration } from '@julr/tenace/types'

import { backoff, Tenace } from '@julr/tenace'

import type { Identifier } from '../database/types.js'
import type { BuilderOptions, ChannelName, ChannelSendResult, NotificationSendResult } from '../types/index.js'
import type {
  SenderInput,
  PreparedRecipient,
  PrepareNotificationFn,
  PrepareRecipientsOptions,
  SendBatchesOptions,
} from '../types/senders.js'
import type { NotificationSender, PreparedMessage } from './notification_sender.js'
import type { ChannelResolver } from './channel_resolver.js'
import { chunk } from '../utils/chunk.js'

/**
 * Handles bulk notification sending using driver batching mode.
 *
 * In driver batching mode, messages are grouped by channel and sent using
 * the channel's batch API when available. This is more efficient for channels
 * that support batch operations (e.g., FCM, Expo push notifications).
 */
export class BatchingSender {
  #sender: NotificationSender
  #channelResolver: ChannelResolver

  constructor(sender: NotificationSender, channelResolver: ChannelResolver) {
    this.#sender = sender
    this.#channelResolver = channelResolver
  }

  /**
   * Sends notifications to multiple recipients using channel batch APIs
   */
  async send(options: SenderInput): Promise<NotificationSendResult> {
    const { builderOptions, recipients, prepareNotification } = options
    const {
      chunkSize = Infinity,
      concurrency = 10,
      continueOnError = false,
      retries = 0,
      timeout,
      onProgress,
    } = builderOptions

    const allResults: ChannelSendResult[] = []
    let completedCount = 0

    for (const recipientChunk of chunk(recipients, chunkSize)) {
      const chunkResults = await this.#processChunk({
        recipientChunk,
        builderOptions,
        prepareNotification,
        concurrency,
        continueOnError,
        retries,
        ...(timeout && { timeout }),
      })

      allResults.push(...chunkResults)
      completedCount += recipientChunk.length
      onProgress?.(completedCount, recipients.length)
    }

    return {
      success: allResults.filter((r) => r.status === 'success').length,
      failed: allResults.filter((r) => r.status === 'failed').length,
      results: allResults,
    }
  }

  /**
   * Processes a single chunk: prepare recipients, group by channel, send batches
   */
  async #processChunk(options: {
    recipientChunk: unknown[]
    builderOptions: BuilderOptions<any>
    prepareNotification: PrepareNotificationFn
    concurrency: number
    continueOnError: boolean
    retries: number
    timeout?: Duration
  }): Promise<ChannelSendResult[]> {
    const preparedRecipients = await this.#prepareRecipients({
      recipients: options.recipientChunk,
      builderOptions: options.builderOptions,
      prepareNotification: options.prepareNotification,
      concurrency: options.concurrency,
      continueOnError: options.continueOnError,
      ...(options.timeout && { timeout: options.timeout }),
    })

    const messagesByChannel = this.#groupByChannel(preparedRecipients)

    return this.#sendBatches({
      messagesByChannel,
      builderOptions: options.builderOptions,
      retries: options.retries,
      ...(options.timeout && { timeout: options.timeout }),
    })
  }

  /**
   * Prepares all recipients for batching by resolving notifications and channels in parallel
   */
  async #prepareRecipients(options: PrepareRecipientsOptions): Promise<PreparedRecipient[]> {
    const { recipients, builderOptions, prepareNotification, concurrency, continueOnError, timeout } = options

    const builder = Tenace.map(recipients, (recipient) =>
      this.#prepareRecipient(recipient, builderOptions, prepareNotification),
    ).withConcurrency(concurrency)

    if (timeout) builder.withTimeoutPerTask(timeout)

    const results = continueOnError
      ? (await builder.settle()).map((r) => (r.status === 'fulfilled' ? r.value : null))
      : await builder.execute()

    return results.filter((p): p is PreparedRecipient => p !== null)
  }

  /**
   * Prepares a single recipient by resolving notification and channel targets
   */
  async #prepareRecipient(
    recipient: unknown,
    builderOptions: BuilderOptions<any>,
    prepareNotification: PrepareNotificationFn,
  ): Promise<PreparedRecipient | null> {
    const { notification, shouldSkip } = await prepareNotification(recipient, builderOptions)
    if (shouldSkip) return null

    const resolvedChannels = await this.#channelResolver.resolveChannels({
      to: recipient as any,
      params: builderOptions.params,
      tenantId: builderOptions.tenantId as Identifier,
      notification: builderOptions.notification,
      ...(builderOptions.via ? { via: builderOptions.via } : {}),
    })

    return { recipient, notification, resolvedChannels, options: { ...builderOptions, to: recipient } }
  }

  /**
   * Groups prepared messages by channel name for batch sending
   */
  #groupByChannel(preparedRecipients: PreparedRecipient[]): Map<string, PreparedMessage[]> {
    const messagesByChannel = new Map<string, PreparedMessage[]>()

    for (const prepared of preparedRecipients) {
      for (const [channelName, channelConfig] of Object.entries(prepared.resolvedChannels)) {
        if (!channelConfig.shouldSend || !channelConfig.target) continue

        const message = this.#sender.prepareMessage({
          notification: prepared.notification,
          channelName: channelName as ChannelName,
          sendOptions: prepared.options,
          channelConfig,
        })
        if (!message) continue

        const messages = messagesByChannel.get(channelName) ?? []
        messages.push(message)
        messagesByChannel.set(channelName, messages)
      }
    }

    return messagesByChannel
  }

  /**
   * Sends batched messages per channel with optional retries and timeout
   */
  async #sendBatches(options: SendBatchesOptions): Promise<ChannelSendResult[]> {
    const { messagesByChannel, builderOptions, retries, timeout } = options
    const { retries: _r, timeout: _t, ...sendOptions } = builderOptions

    const sendChannel = async (channelName: string, messages: PreparedMessage[]) => {
      const sendBatch = () =>
        this.#sender.sendChannelBatch({ channelName: channelName as ChannelName, messages, sendOptions })

      if (!retries && !timeout) return sendBatch()

      let builder = Tenace.call(sendBatch)
      if (timeout) builder = builder.withTimeout(timeout, 'aggressive')
      if (retries > 0) {
        builder = builder.withRetry({
          times: retries,
          delay: backoff.exponentialWithJitter({ initial: 100, max: 5000 }),
        })
      }

      return builder.execute()
    }

    const promises = Array.from(messagesByChannel.entries()).map(([channel, msgs]) =>
      sendChannel(channel, msgs),
    )

    return (await Promise.all(promises)).flat()
  }
}
