import { Tenace } from '@julr/tenace'

import type { NotificationSender } from './notification_sender.ts'
import type { SenderInput, PrepareNotificationFn } from '../types/senders.ts'
import type { BuilderOptions, NotificationSendResult } from '../types/index.ts'

import { chunk } from '../utils/chunk.ts'

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
   * Sends notifications to every recipient with concurrency control
   */
  async send(options: SenderInput): Promise<NotificationSendResult> {
    const { chunkSize = Infinity, onProgress } = options.builderOptions
    const allResults: NotificationSendResult[] = []
    let completedCount = 0
    const totalCount = options.recipients.length

    for (const recipientChunk of chunk(options.recipients, chunkSize)) {
      const chunkResults = await this.#processChunk({
        recipientChunk,
        builderOptions: options.builderOptions,
        prepareNotification: options.prepareNotification,
        onProgress: () => {
          completedCount++
          onProgress?.(completedCount, totalCount)
        },
      })

      allResults.push(...chunkResults)
    }

    return this.#aggregateResults(allResults)
  }

  /**
   * Processes a single chunk of recipients. Retries and timeouts apply per channel,
   * inside NotificationSender, whatever the number of recipients.
   */
  async #processChunk(options: {
    recipientChunk: unknown[]
    builderOptions: BuilderOptions<any>
    prepareNotification: PrepareNotificationFn
    onProgress: () => void
  }): Promise<NotificationSendResult[]> {
    const { concurrency = 10, continueOnError, throwOnError } = options.builderOptions
    const builder = Tenace.map(
      options.recipientChunk,
      async (recipient) => {
        const recipientOptions = { ...options.builderOptions, to: recipient }

        try {
          const { notification, shouldSkip } = await options.prepareNotification(
            recipient,
            recipientOptions,
          )
          if (shouldSkip) return { success: 0, failed: 0, results: [] }

          return await this.#sender.send(recipientOptions, notification)
        } finally {
          options.onProgress()
        }
      },
      { concurrency },
    )

    // An explicit `throwOnError(true)` stops on the first failing recipient
    if (!continueOnError || throwOnError) return builder.execute()

    const settled = await builder.settle()
    return settled.map((result) =>
      result.ok ? result.value : { success: 0, failed: 1, results: [] },
    )
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
