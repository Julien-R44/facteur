import type { Logger } from '@julr/utils/logger'
import type { Awaitable } from '@julr/utils/types'

import type { Facteur } from './facteur.js'
import type { DatabaseAdapter, Identifier } from './database/types.js'
import type { Emitter } from './types/events.js'
export type { FacteurEvents, Emitter } from './types/events.js'

export type FacteurChannelFactory = Channel<any, any, any, any>

export interface QueueItemOptions {
  delay?: number
}

export interface QueueAdapter {
  queue(message: any, options?: QueueItemOptions): Promise<void>
  startQueueProcessor(): void
  disconnect(): void
}

export interface FacteurConfiguration<
  KnownChannels extends Record<string, Channel> = Record<string, Channel>,
  DBAdapter extends DatabaseAdapter | null = null,
> {
  logger?: Logger
  emitter?: Emitter
  channels: KnownChannels
  queueAdapter?: QueueAdapter
  databaseAdapter?: DBAdapter
  discoverer: {
    searchDirectory: URL
    fileSuffix?: string
  }
  preferences?: DefaultPreferences<KnownChannels>
}

export interface DefaultPreferences<KnownChannels extends Record<string, Channel>> {
  enabled?: boolean
  global?: { channels?: Record<keyof KnownChannels, boolean> }
  categories?: Record<
    string,
    { channels?: Partial<Record<keyof KnownChannels, boolean>> } | boolean
  >
}

export interface ResolvedDefaultPreferences<KnownChannels extends Record<string, Channel>> {
  enabled: boolean
  global: { channels: Record<keyof KnownChannels, boolean> }
  categories: Record<string, { channels: Record<keyof KnownChannels, boolean> }>
}

export type ChannelSendParams<Message, Targets> = {
  notifiable?: any
  message: Message
  targets?: Targets
  tenantId?: Identifier | undefined
}

export const kTargetSymbol = Symbol('facteur:targets')
export interface Channel<_Options = any, Message = any, Response = any, Targets = any> {
  [kTargetSymbol]: Targets
  name: string
  send: (options: ChannelSendParams<Message, Targets>) => Awaitable<Response>
}

export type ChannelName = keyof NotificationChannels

export type ProviderTarget<_N extends Notifiable, K extends ChannelName> = ExtractChannelTargets<
  NotificationChannels[K]
>

export interface Notifiable {
  notificationTargets?(): NotifiableTargets
}

export type ExtractChannelTargets<T> = T extends Channel<any, any, any, infer U> ? U : never

export type NotifiableTargets = {
  [K in keyof NotificationChannels]?: ExtractChannelTargets<NotificationChannels[K]>
}

export type InferChannelsFromConfig<T> =
  T extends Facteur<infer U> ? U : T extends FacteurConfiguration<infer X> ? X : never
export interface NotificationChannels {}

export interface DeliverByOptions<N extends Notifiable = Notifiable> {
  if: (options: {
    notifiable: N
    params?: any
    preferences?: Record<string, boolean | undefined>
  }) => boolean
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

export interface MessageCtx<
  N extends Notifiable = Notifiable,
  Params extends Record<string, any> = {},
> {
  notifiable: N
  params: Params
  tenantId?: Identifier
}

export abstract class Notification<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  N extends Notifiable = Notifiable,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Params extends Record<string, any> = any,
> {
  static options: NotificationOptions<any> = {
    name: '',
    tags: [],
    deliverBy: {},
  }
}

export type ChannelSpecificConfig<N extends Notifiable> = N extends never
  ? {
      [K in ChannelName]?: ProviderTarget<never, K>
    }
  : {
      [K in ChannelName]?: boolean | ProviderTarget<N, K>
    }

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

export interface ChannelSendResult {
  channel: ChannelName
  status: 'success' | 'failed'
  error?: any
}

export interface NotificationSendResult {
  success: number
  failed: number
  results: ChannelSendResult[]
}
