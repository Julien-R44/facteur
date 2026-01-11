import type { Awaitable } from '@julr/utils/types'
import type { Logger } from '@julr/utils/logger'
import type { Duration } from '@julr/tenace/types'

import type { QueueAdapter } from './queue.js'
import type { DefaultPreferences } from './preferences.js'
import type { Notifiable, Notification, NotificationClass } from './index.js'
import type { ChannelName, NotificationChannels } from './extend.js'
import type { Emitter } from './events.js'
import type { Channel } from './channel.js'
import type { DatabaseAdapter, Identifier } from '../database/types.js'

/**
 * Type for values that can be a single item or an array of items
 */
export type Arrayable<T> = T | T[]

/**
 * Configuration options for the Facteur library
 */
export interface FacteurConfiguration<
  KnownChannels extends Record<string, Channel> = Record<string, Channel>,
  DBAdapter extends DatabaseAdapter | null = null,
> {
  logger?: Logger
  emitter?: Emitter

  /**
   * Channels to use for sending notifications.
   */
  channels: KnownChannels

  /**
   * A queue adapter to use for sending notifications.
   * Needs to be provided if you want to use some queueing capabilities.
   */
  queueAdapter?: QueueAdapter

  /**
   * Database adapter to use for storing things, like topics and preferences.
   * If not provided, you will not be able these features.
   */
  databaseAdapter?: DBAdapter

  /**
   * Discoverer configuration
   */
  discoverer: {
    /**
     * Directory to search for notification classes. Will scan recursively.
     */
    searchDirectory: URL

    /**
     * Suffix for notification files.
     * @default '_notification.ts'
     */
    fileSuffix?: string
  }

  /**
   * The default preferences for the users.
   */
  preferences?: DefaultPreferences<KnownChannels>

  /**
   * A callback that will be called to instantiate a notification class.
   * Can be handy for using dependency injection or other custom instantiation logic.
   * If not provided, the default constructor will be used.
   */
  notificationResolver?: NotificationResolver

  /**
   * Global retry configuration for channel sends.
   * Can be overridden per-channel or per-send.
   */
  retry?: RetryConfig<KnownChannels>
}

/**
 * Resolver function type for notifications
 */
export type NotificationResolver = (
  notification: new (ctx: MessageCtx<any, any>, ...args: any[]) => Notification,
  ctx: MessageCtx<any, any>,
) => Awaitable<Notification>

export interface NotificationOptions<N extends Notifiable = Notifiable> {
  /**
   * A human readable name for the notification.
   * Used for UI purpose
   */
  name: string

  /**
   * A unique identifier for the notification.
   * Used to identify the notification in the database and preferences.
   *
   * By default it is the class name
   */
  identifier?: string

  /**
   * Bypass preferences and send the notification regardless of user settings.
   * Useful for critical notifications that should always be sent.
   */
  critical?: boolean

  /**
   * Human readable tags. Also used for UI purpose
   */
  tags?: string[]

  /**
   * Channel category
   */
  category?: string

  /**
   * Channels to deliver the notification by.
   */
  deliverBy: Partial<Record<ChannelName, boolean | DeliverByOptions<N>>>
}

export interface DeliverByOptions<N extends Notifiable = Notifiable> {
  if: (options: {
    to: N
    params?: any
    preferences?: Record<string, boolean | undefined>
  }) => boolean
}

/**
 * Parameters received by the `as*Message` methods of a notification.
 */
export interface MessageCtx<
  N extends Notifiable | undefined = Notifiable,
  Params extends Record<string, any> = {},
> {
  to: N
  params: Params
  tenantId?: Identifier | undefined
}

/**
 * Extract the parameters type from a notification class
 */
export type ExtractParams<T> = T extends NotificationClass<any, infer P> ? P : never

/**
 * Extract the notifiable type from a notification class
 */
export type ExtractNotifiable<T> = T extends NotificationClass<infer N, any> ? N : never

/**
 * Determine if a notification requires parameters or if they are optional
 */
export type NotificationParams<TNotificationClass extends NotificationClass<any, any>> =
  ExtractParams<TNotificationClass> extends unknown
    ? unknown extends ExtractParams<TNotificationClass>
      ? { params?: ExtractParams<TNotificationClass> }
      : { params: ExtractParams<TNotificationClass> }
    : { params: ExtractParams<TNotificationClass> }

/**
 * Common options available for all send operations
 */
export type CommonSendOptions<TNotificationClass extends NotificationClass<any, any>> =
  NotificationParams<TNotificationClass> & {
    /**
     * Throw an error if at least one channel fails to send
     * If false, the result will contain the details of each channel send attempt
     */
    throwOnError?: boolean
  }

/**
 * Helper type to determine if a notification is anonymous (notifiable is undefined)
 */
type IsAnonymousNotification<T> =
  T extends NotificationClass<infer N, any> ? (N extends undefined ? true : false) : false

/**
 * Options for the `send` method
 */
export type SendOptions<TNotificationClass extends NotificationClass<any, any>> =
  IsAnonymousNotification<TNotificationClass> extends true
    ? CommonSendOptions<TNotificationClass> &
        RetryOptions & {
          notification: TNotificationClass
          via: { [K in ChannelName]?: ProviderTarget<any, K> }
          tenantId?: Identifier
        }
    : CommonSendOptions<TNotificationClass> &
        BulkSendOptions & {
          notification: TNotificationClass
          to: Arrayable<NonNullable<ExtractNotifiable<TNotificationClass>>>
          via?: ChannelSpecificConfig<ExtractNotifiable<TNotificationClass>>
          tenantId?: Identifier
        }

export type ChannelSpecificConfig<N extends Notifiable> = {
  [K in ChannelName]?: boolean | ProviderTarget<N, K>
}

export type ExtractChannelTargets<T> = T extends Channel<any, any, any, infer U> ? U : never

export type ProviderTarget<_N extends Notifiable, K extends ChannelName> = ExtractChannelTargets<
  NotificationChannels[K]
>

/**
 * Retry options for channel sends
 */
export interface RetryOptions {
  /**
   * Number of retry attempts when a channel send fails.
   * Uses exponential backoff with jitter.
   * @default 0 (no retries)
   */
  retries?: number

  /**
   * Timeout for each channel send operation.
   * Accepts milliseconds or duration strings like '30s', '1m'.
   */
  timeout?: Duration
}

/**
 * Global retry configuration with per-channel overrides
 */
export interface RetryConfig<KnownChannels extends Record<string, Channel> = Record<string, Channel>> extends RetryOptions {
  /**
   * Per-channel retry overrides
   */
  channels?: {
    [K in keyof KnownChannels]?: RetryOptions
  }
}

/**
 * Options for bulk sending operations
 */
export interface BulkSendOptions extends RetryOptions {
  /**
   * Number of recipients to process per chunk.
   * Useful for memory management with large recipient lists.
   * @default Infinity (no chunking)
   */
  chunkSize?: number

  /**
   * Maximum number of concurrent sends.
   * @default 10
   */
  concurrency?: number

  /**
   * If true, continues sending even if some recipients fail (Promise.allSettled behavior).
   * If false, stops on first error (Promise.all behavior).
   * @default false
   */
  continueOnError?: boolean

  /**
   * Number of retry attempts per recipient.
   * Uses exponential backoff with jitter.
   * @default 0 (no retries)
   */
  retries?: number

  /**
   * Timeout per recipient send operation.
   * Accepts milliseconds or duration strings like '30s', '1m'.
   */
  timeout?: Duration

  /**
   * Callback invoked after each recipient is processed.
   */
  onProgress?: (completed: number, total: number) => void

  /**
   * Disable driver-level batching even if the channel supports it.
   * When true, each message is sent individually.
   * @default false
   */
  disableDriverBatch?: boolean

  /**
   * Enable batch mode which groups messages by channel and uses batch APIs when available.
   * This mode has different semantics:
   * - Retries and timeouts apply at the batch level, not per-recipient
   * - Progress callback is called per chunk, not per recipient
   * - More efficient for channels that support batch APIs (FCM, Expo)
   * @default false
   */
  useDriverBatching?: boolean
}
