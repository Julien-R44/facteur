import type { FacteurWorkerConfig } from './types.ts'

import { facteurQueueContext } from './context.ts'

/**
 * Initialize the Facteur queue worker context.
 * This must be called before the @boringnode/queue Worker starts processing jobs.
 *
 * @example
 * ```typescript
 * import { Worker } from '@boringnode/queue'
 * import { initFacteurWorker } from '@facteurjs/adapter-boring-queue'
 * import { facteur } from './config/notifications.ts'
 *
 * // Initialize the context
 * await initFacteurWorker({ facteur })
 *
 * // Start the worker
 * const worker = new Worker(queueConfig)
 * await worker.start(['notifications'])
 * ```
 */
export async function initFacteurWorker(config: FacteurWorkerConfig): Promise<void> {
  await facteurQueueContext.init(config)
}
