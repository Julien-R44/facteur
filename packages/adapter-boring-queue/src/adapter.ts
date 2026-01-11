import type { QueueAdapter, QueueItemOptions, NotificationJobPayload } from '@facteurjs/core/types'

import type { BoringNodeQueueAdapterConfig } from './types.ts'

import { SendNotificationJob } from './job.ts'

/**
 * Queue adapter for @boringnode/queue.
 * Dispatches notification jobs to be processed by a worker.
 */
export class BoringNodeQueueAdapter implements QueueAdapter {
  #config: Required<BoringNodeQueueAdapterConfig>

  constructor(config: BoringNodeQueueAdapterConfig = {}) {
    this.#config = {
      defaultQueue: config.defaultQueue ?? 'notifications',
    }

    // Update the job's default queue
    SendNotificationJob.options.queue = this.#config.defaultQueue
  }

  #parseDelay(delay: string | number | undefined): string | undefined {
    if (delay === undefined) return undefined
    if (typeof delay === 'number') return `${delay}ms`
    return delay
  }

  async queue(payload: NotificationJobPayload, options?: QueueItemOptions): Promise<void> {
    const delay = this.#parseDelay(options?.delay)

    let dispatch = SendNotificationJob.dispatch(payload)

    if (delay) dispatch = dispatch.in(delay)

    await dispatch
  }
}
