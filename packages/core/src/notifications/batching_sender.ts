import type { Duration } from '@julr/tenace/types'

import { Tenace } from '@julr/tenace'

import type { NotificationSender, PreparedMessage } from './notification_sender.ts'
import type { ChannelResolver } from './channel_resolver.ts'
import type {
  SenderInput,
  PreparedRecipient,
  PrepareNotificationFn,
  PrepareRecipientsOptions,
} from '../types/senders.ts'
import type {
  BuilderOptions,
  ChannelName,
  ChannelSendResult,
  NotificationSendResult,
} from '../types/index.ts'
import type { Identifier } from '../database/types.ts'

import { chunk } from '../utils/chunk.ts'

type BatchRecipient = PreparedRecipient & {
  messages: PreparedMessage[]
  results: ChannelSendResult[]
}

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
      timeout,
      onProgress,
    } = builderOptions

    const result: NotificationSendResult = { success: 0, failed: 0, results: [] }
    let completedCount = 0

    for (const recipientChunk of chunk(recipients, chunkSize)) {
      const chunkResults = await this.#processChunk({
        recipientChunk,
        builderOptions,
        prepareNotification,
        concurrency,
        continueOnError,
        ...(timeout && { timeout }),
      })

      result.success += chunkResults.success
      result.failed += chunkResults.failed
      result.results.push(...chunkResults.results)
      completedCount += recipientChunk.length
      onProgress?.(completedCount, recipients.length)
    }

    return result
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
    timeout?: Duration
  }): Promise<NotificationSendResult> {
    const { preparedRecipients, failed } = await this.#prepareRecipients({
      recipients: options.recipientChunk,
      builderOptions: options.builderOptions,
      prepareNotification: options.prepareNotification,
      concurrency: options.concurrency,
      continueOnError: options.continueOnError,
      ...(options.timeout && { timeout: options.timeout }),
    })

    const messagesByChannel = await this.#groupByChannel(preparedRecipients)
    const resultsByMessage = new Map<PreparedMessage, ChannelSendResult>()

    await Promise.all(
      Array.from(messagesByChannel, async ([channelName, messages]) => {
        const results = await this.#sender.sendChannelBatch({
          channelName: channelName as ChannelName,
          messages,
          sendOptions: options.builderOptions,
        })
        messages.forEach((message, index) => {
          // Results are aligned with input messages, regardless of driver result order.
          resultsByMessage.set(message, results[index]!)
        })
      }),
    )

    // Finalize every prepared notification, even if another notification fails.
    const settled = await Tenace.map(preparedRecipients, (prepared) =>
      this.#sender.processResults({
        notification: prepared.notification,
        results: [
          ...prepared.results,
          ...prepared.messages.map((msg) => resultsByMessage.get(msg)!),
        ],
        throwOnError: !options.continueOnError && options.builderOptions.throwOnError !== false,
      }),
    )
      .withConcurrency(options.concurrency)
      .settle()

    const result: NotificationSendResult = { success: 0, failed, results: [] }
    for (const entry of settled) {
      if (entry.status === 'rejected') {
        if (!options.continueOnError) throw entry.reason
        result.failed++
        continue
      }
      result.success += entry.value.success
      result.failed += entry.value.failed
      result.results.push(...entry.value.results)
    }
    return result
  }

  /**
   * Prepares all recipients for batching by resolving notifications and channels in parallel
   */
  async #prepareRecipients(options: PrepareRecipientsOptions): Promise<{
    preparedRecipients: BatchRecipient[]
    failed: number
  }> {
    const {
      recipients,
      builderOptions,
      prepareNotification,
      concurrency,
      continueOnError,
      timeout,
    } = options

    const builder = Tenace.map(recipients, (recipient) =>
      this.#prepareRecipient(recipient, builderOptions, prepareNotification),
    ).withConcurrency(concurrency)

    if (timeout) builder.withTimeoutPerTask(timeout)

    if (!continueOnError) {
      return {
        preparedRecipients: (await builder.execute()).filter(
          (p): p is BatchRecipient => p !== null,
        ),
        failed: 0,
      }
    }

    const settled = await builder.settle()
    return {
      preparedRecipients: settled
        .map((r) => (r.status === 'fulfilled' ? r.value : null))
        .filter((p): p is BatchRecipient => p !== null),
      failed: settled.filter((r) => r.status === 'rejected').length,
    }
  }

  /**
   * Prepares a single recipient by resolving notification and channel targets
   */
  async #prepareRecipient(
    recipient: unknown,
    builderOptions: BuilderOptions<any>,
    prepareNotification: PrepareNotificationFn,
  ): Promise<BatchRecipient | null> {
    const { notification, shouldSkip } = await prepareNotification(recipient, builderOptions)
    if (shouldSkip) return null

    const resolvedChannels = await this.#channelResolver.resolveChannels({
      to: recipient as any,
      params: builderOptions.params,
      tenantId: builderOptions.tenantId as Identifier,
      notification: builderOptions.notification,
      ...(builderOptions.via ? { via: builderOptions.via } : {}),
    })

    return {
      recipient,
      notification,
      resolvedChannels,
      options: { ...builderOptions, to: recipient },
      messages: [],
      results: [],
    }
  }

  /**
   * Groups prepared messages by channel name for batch sending
   */
  async #groupByChannel(
    preparedRecipients: BatchRecipient[],
  ): Promise<Map<string, PreparedMessage[]>> {
    const messagesByChannel = new Map<string, PreparedMessage[]>()

    for (const prepared of preparedRecipients) {
      this.#sender.emitNotificationSending(prepared.notification, prepared.resolvedChannels)
      for (const [channelName, channelConfig] of Object.entries(prepared.resolvedChannels)) {
        if (!channelConfig.shouldSend || !channelConfig.target) continue

        try {
          const message = await this.#sender.prepareMessage({
            notification: prepared.notification,
            channelName: channelName as ChannelName,
            sendOptions: prepared.options,
            channelConfig,
          })
          if (!message) continue

          prepared.messages.push(message)
          const messages = messagesByChannel.get(channelName) ?? []
          messages.push(message)
          messagesByChannel.set(channelName, messages)
        } catch (error) {
          prepared.results.push({ channel: channelName as ChannelName, status: 'failed', error })
        }
      }
    }

    return messagesByChannel
  }
}
