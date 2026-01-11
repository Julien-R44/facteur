import type { Facteur } from '@facteurjs/core'
import type { NotificationJobPayload } from '@facteurjs/core/types'

/**
 * Configuration for the BoringNode Queue adapter
 */
export interface BoringNodeQueueAdapterConfig {
  /**
   * Default queue name for notifications
   * @default 'notifications'
   */
  defaultQueue?: string
}

/**
 * Configuration for the Facteur worker
 */
export interface FacteurWorkerConfig {
  /**
   * The Facteur instance to use for sending notifications
   */
  facteur: Facteur<any, any>

  /**
   * Hook called before sending a queued notification.
   * Return false to skip sending.
   */
  beforeSend?: (payload: NotificationJobPayload) => Promise<boolean> | boolean

  /**
   * Hook called after successful send
   */
  afterSend?: (payload: NotificationJobPayload) => Promise<void> | void

  /**
   * Hook called on send failure
   */
  onError?: (payload: NotificationJobPayload, error: Error) => Promise<void> | void
}
