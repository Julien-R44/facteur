import type { Identifier } from '../database/types.ts'

/**
 * Payload structure for queued notification jobs.
 * Each job represents one recipient × channel combination.
 */
export interface NotificationJobPayload {
  /**
   * Notification class identifier (class name or options.identifier)
   */
  notificationIdentifier: string

  /**
   * Serialized notification params
   */
  params: Record<string, any>

  /**
   * Serialized recipient data for reconstruction in the worker
   */
  recipientData: Record<string, any>

  /**
   * Channel to send through
   */
  channelName: string

  /**
   * Pre-resolved target for the channel (email address, device token, etc.)
   */
  target: unknown

  /**
   * Tenant ID if multi-tenant
   */
  tenantId?: Identifier
}

/**
 * Options for queueing a notification
 */
export interface QueueItemOptions {
  /**
   * Delay before processing (milliseconds or duration string like '5m')
   */
  delay?: number | string

  /**
   * Queue name to use
   */
  queue?: string
}

/**
 * Adapter interface for queue implementations
 */
export interface QueueAdapter {
  /**
   * Queue a notification job for later processing
   */
  queue(payload: NotificationJobPayload, options?: QueueItemOptions): Promise<void>
}
