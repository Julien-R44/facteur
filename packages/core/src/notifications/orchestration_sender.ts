import type { Duration } from '@julr/tenace/types'

import { backoff, Tenace } from '@julr/tenace'

import type { BuilderOptions, NotificationSendResult } from '../types/index.ts'
import type { SenderInput, PrepareNotificationFn } from '../types/senders.ts'
import type { NotificationSender } from './notification_sender.ts'
import { chunk } from '../utils/chunk.ts'
import { errors } from '../errors/index.ts'

/**
 * Handles bulk notification sending using orchestration mode.
 *
 * In orchestration mode, each recipient is processed individually with configurable
 * concurrency, chunking, retries, and timeout. This provides fine-grained control
 * over the sending process and per-recipient error handling.
 */
export class OrchestrationSender {
  #sender: NotificationSender

  constructor(sender: NotificationSender) {
    this.#sender = sender
  }

  /**
   * Sends notifications to multiple recipients with concurrency control
   */
  async send(options: SenderInput): Promise<NotificationSendResult> {
    const {
      chunkSize = Infinity,
      concurrency = 10,
      continueOnError = false,
      retries = 0,
      timeout,
      onProgress,
    } = options.builderOptions

    const chunks = chunk(options.recipients, chunkSize)
    const allResults: NotificationSendResult[] = []
    let completedCount = 0
    const totalCount = options.recipients.length

    // Strip bulk-specific retry options so they don't double-apply at channel level
    const { retries: _retries, timeout: _timeout, ...perRecipientOptions } = options.builderOptions

    for (const recipientChunk of chunks) {
      const chunkResults = await this.#processChunk({
        recipientChunk,
        perRecipientOptions,
        prepareNotification: options.prepareNotification,
        concurrency,
        retries,
        continueOnError,
        onProgress: () => {
          completedCount++
          onProgress?.(completedCount, totalCount)
        },
        ...(timeout && { timeout }),
      })

      allResults.push(...chunkResults)
    }

    return this.#aggregateResults(allResults)
  }

  /**
   * Processes a single chunk of recipients with Tenace for concurrency and retry
   */
  async #processChunk(options: {
    recipientChunk: unknown[]
    perRecipientOptions: Omit<BuilderOptions<any>, 'retries' | 'timeout'>
    prepareNotification: PrepareNotificationFn
    concurrency: number
    retries: number
    timeout?: Duration
    continueOnError: boolean
    onProgress: () => void
  }): Promise<NotificationSendResult[]> {
    const failedResults = new WeakMap<object, NotificationSendResult>()
    const builder = Tenace.map(options.recipientChunk, async (recipient) => {
      const recipientOptions = { ...options.perRecipientOptions, to: recipient }
      const { notification, shouldSkip } = await options.prepareNotification(
        recipient,
        recipientOptions,
      )

      if (shouldSkip) {
        options.onProgress()
        return { success: 0, failed: 0, results: [] }
      }

      // Keep channel results even when the recipient fails, so `continueOnError()` can report them
      const result = await this.#sender.send(
        { ...recipientOptions, throwOnError: false },
        notification,
      )
      if (result.failed > 0 && options.perRecipientOptions.throwOnError !== false) {
        const error = new errors.E_SEND_NOTIFICATION_FAILED(
          result.results.filter((r) => r.status === 'failed').map((r) => r.error),
        )
        failedResults.set(error, result)
        throw error
      }

      options.onProgress()

      return result
    }).withConcurrency(options.concurrency)

    if (options.retries > 0) {
      builder.withRetryPerTask(options.retries, {
        delay: backoff.exponentialWithJitter({ initial: 100, max: 5000 }),
      })
    }

    if (options.timeout) builder.withTimeoutPerTask(options.timeout)
    if (!options.continueOnError) return builder.execute()

    const settled = await builder.settle()

    return settled.map((result) => {
      if (result.status === 'fulfilled') return result.value
      return failedResults.get(result.reason) ?? { success: 0, failed: 1, results: [] }
    })
  }

  /**
   * Combines multiple send results into a single aggregated result
   */
  #aggregateResults(results: NotificationSendResult[]): NotificationSendResult {
    return {
      success: results.reduce((sum, r) => sum + r.success, 0),
      failed: results.reduce((sum, r) => sum + r.failed, 0),
      results: results.flatMap((r) => r.results),
    }
  }
}
