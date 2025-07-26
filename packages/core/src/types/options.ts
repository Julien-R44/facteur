import type { Logger } from '@julr/utils/logger'
import type { DatabaseAdapter, Identifier } from '../database/types.js'
import type { Emitter } from './events.js'
import type { QueueAdapter } from './queue.js'
import type { DefaultPreferences } from './preferences.js'
import type { Notifiable, Notification } from './index.js'
import type { ChannelName, NotificationChannels } from './extend.js'
import type { Channel } from './channel.js'

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
}

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
    notifiable: N
    params?: any
    preferences?: Record<string, boolean | undefined>
  }) => boolean
}

/**
 * Parameters received by the `as*Message` methods of a notification.
 */
export interface MessageCtx<
  N extends Notifiable = Notifiable,
  Params extends Record<string, any> = {},
> {
  notifiable: N
  params: Params
  tenantId?: Identifier
}

/**
 * Options for the `send` method
 */
export interface SendOptions<
  TNotifiable extends Notifiable,
  TNotification extends Notification<TNotifiable, any>,
> {
  notification: new (...args: any[]) => TNotification
  notifiable?: TNotifiable
  params?: TNotification extends Notification<any, infer P> ? P : never
  via?: ChannelSpecificConfig<TNotifiable>
  tenantId?: Identifier

  /**
   * Throw an error if at least one channel fails to send
   * If false, the result will contain the details of each channel send attempt
   */
  throwOnError?: boolean
}

export type ChannelSpecificConfig<N extends Notifiable> = N extends never
  ? { [K in ChannelName]?: ProviderTarget<never, K> }
  : { [K in ChannelName]?: boolean | ProviderTarget<N, K> }

export type ExtractChannelTargets<T> = T extends Channel<any, any, any, infer U> ? U : never

export type ProviderTarget<_N extends Notifiable, K extends ChannelName> = ExtractChannelTargets<
  NotificationChannels[K]
>
