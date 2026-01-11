import { Job } from '@boringnode/queue'
import type { JobOptions } from '@boringnode/queue/types'
import type { NotificationJobPayload } from '@facteurjs/core/types'

import { facteurQueueContext } from './context.ts'

/**
 * Job class for sending queued notifications.
 * This job is discovered and processed by @boringnode/queue's Worker.
 */
export class SendNotificationJob extends Job<NotificationJobPayload> {
  static override options: JobOptions = {
    queue: 'notifications',
    maxRetries: 3,
  }

  async execute(): Promise<void> {
    await facteurQueueContext.processJob(this.payload)
  }
}
