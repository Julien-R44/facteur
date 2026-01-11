import type { Duration } from '@julr/tenace/types'

import type { BuilderOptions, Notification } from './index.ts'
import type { ResolvedChannels } from '../notifications/channel_resolver.ts'
import type { PreparedMessage } from '../notifications/notification_sender.ts'

/**
 * Function that prepares a notification for a recipient, resolving the notification
 * instance and running lifecycle hooks (beforeSend, shouldSend)
 */
export type PrepareNotificationFn = (
  recipient: unknown,
  options: BuilderOptions<any>,
) => Promise<{ notification: Notification<any, any>; shouldSkip: boolean }>

/**
 * Input for bulk sender classes (OrchestrationSender, BatchingSender)
 */
export interface SenderInput {
  recipients: unknown[]
  builderOptions: BuilderOptions<any>
  prepareNotification: PrepareNotificationFn
}

/**
 * Recipient prepared for batch sending with resolved notification and channels
 */
export interface PreparedRecipient {
  recipient: unknown
  notification: Notification<any, any>
  resolvedChannels: ResolvedChannels
  options: BuilderOptions<any>
}

/**
 * Options for preparing recipients in parallel
 */
export interface PrepareRecipientsOptions {
  recipients: unknown[]
  builderOptions: BuilderOptions<any>
  prepareNotification: PrepareNotificationFn
  concurrency: number
  continueOnError: boolean
  timeout?: Duration
}

/**
 * Options for sending batched messages per channel
 */
export interface SendBatchesOptions {
  messagesByChannel: Map<string, PreparedMessage[]>
  builderOptions: BuilderOptions<any>
  retries: number
  timeout?: Duration
}
