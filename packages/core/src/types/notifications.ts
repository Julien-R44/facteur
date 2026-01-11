// oxlint-disable no-unused-vars

import type { Awaitable } from '@julr/utils/types'

import type { ExtractChannelTargets, MessageCtx, NotificationOptions } from './options.ts'
import type { ChannelName, NotificationChannels } from './index.ts'
import type { Identifier } from '../database/types.ts'

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
  protected notifiable: N
  protected params: Params
  protected tenantId: Identifier | undefined

  constructor(ctx: MessageCtx<N, Params>) {
    this.notifiable = ctx.to
    this.params = ctx.params
    this.tenantId = ctx.tenantId
  }

  static options: NotificationOptions<any> = {
    name: '',
    tags: [],
    deliverBy: {},
  }

  /**
   * Determine if the notification should be sent or not
   */
  shouldSend(): Awaitable<boolean> {
    return true
  }

  /**
   * Method invoked before sending the notification.
   * Can be used to perform any pre-send logic.
   */
  beforeSend(): Awaitable<void> {
    // No-op by default
  }

  /**
   * Method invoked after the notification has been sent.
   * Can be used to perform any post-send logic.
   */
  afterSend(): Awaitable<void> {
    // No-op by default
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
