// oxlint-disable no-unused-vars

import type { ChannelName, NotificationChannels } from './index.js'
import type { ExtractChannelTargets, NotificationOptions } from './options.js'

/**
 * Constructor type for notification classes
 */
export type NotificationClass<
  TNotifiable extends Notifiable | undefined,
  TParams extends Record<string, any> = Record<string, any>,
> = new (...args: any[]) => Notification<TNotifiable, TParams>

/**
 * Base abstract class for all notifications
 */
export abstract class Notification<
  N extends Notifiable | undefined = Notifiable | undefined,
  Params extends Record<string, any> = any,
> {
  _notifiable?: N

  static options: NotificationOptions<any> = {
    name: '',
    tags: [],
    deliverBy: {},
  }
}

/**
 * Result of sending notification through a specific channel
 */
export interface ChannelSendResult {
  channel: ChannelName
  status: 'success' | 'failed'
  error?: any
}

/**
 * Overall result of sending a notification across all channels
 */
export interface NotificationSendResult {
  success: number
  failed: number
  results: ChannelSendResult[]
}

/**
 * Interface for entities that can receive notifications
 */
export interface Notifiable {
  notificationTargets?(): NotifiableTargets
}

export type NotifiableTargets = {
  [K in keyof NotificationChannels]?: ExtractChannelTargets<NotificationChannels[K]>
}
