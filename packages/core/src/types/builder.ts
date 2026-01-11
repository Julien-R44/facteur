import type { Duration } from '@julr/tenace/types'

import type { NotificationClass, NotificationSendResult } from './notifications.js'
import type {
  BulkSendOptions,
  ChannelSpecificConfig,
  ExtractParams,
  ExtractNotifiable,
  RetryOptions,
} from './options.js'
import type { Identifier } from '../database/types.js'
import type { ChannelName } from './extend.js'

/**
 * Helper type to check if params are required for a notification
 */
export type HasRequiredParams<T extends NotificationClass<any, any>> =
  ExtractParams<T> extends Record<string, never>
    ? false
    : unknown extends ExtractParams<T>
      ? false
      : true

/**
 * Helper type to check if a notification is anonymous (no notifiable)
 */
export type IsAnonymous<T extends NotificationClass<any, any>> =
  ExtractNotifiable<T> extends undefined ? true : false

/**
 * State tracking for the builder
 */
export interface BuilderState {
  hasParams: boolean
  hasTo: boolean
  hasVia: boolean
}

/**
 * Internal options accumulated by the builder. Extends BulkSendOptions for bulk operations.
 */
export interface BuilderOptions<TNotification extends NotificationClass<any, any>> extends BulkSendOptions {
  notification: TNotification
  params?: ExtractParams<TNotification>
  to?: ExtractNotifiable<TNotification> | ExtractNotifiable<TNotification>[] | unknown
  via?: ChannelSpecificConfig<any>
  tenantId?: Identifier
  throwOnError?: boolean
}

/**
 * Minimal options needed by NotificationSender
 */
export interface InternalSendOptions extends RetryOptions {
  notification: NotificationClass<any, any>
  params?: Record<string, any>
  to?: unknown
  via?: ChannelSpecificConfig<any>
  tenantId?: Identifier
  throwOnError?: boolean
  disableDriverBatch?: boolean
}

/**
 * Merges builder state updates. Used to track which methods have been called.
 */
type MergeState<TState extends BuilderState, TUpdate extends Partial<BuilderState>> = {
  hasParams: TUpdate extends { hasParams: infer P } ? P : TState['hasParams']
  hasTo: TUpdate extends { hasTo: infer T } ? T : TState['hasTo']
  hasVia: TUpdate extends { hasVia: infer V } ? V : TState['hasVia']
}

/**
 * Methods available on all builders: bulk options, retry, and tenant selection.
 */
interface CommonBuilderMethods<TNotification extends NotificationClass<any, any>, TState extends BuilderState> {
  tenant(id: Identifier): NotificationBuilder<TNotification, TState>
  chunkSize(size: number): NotificationBuilder<TNotification, TState>
  concurrency(limit: number): NotificationBuilder<TNotification, TState>
  continueOnError(value?: boolean): NotificationBuilder<TNotification, TState>
  retries(count: number): NotificationBuilder<TNotification, TState>
  timeout(duration: Duration): NotificationBuilder<TNotification, TState>
  throwOnError(value?: boolean): NotificationBuilder<TNotification, TState>
  useDriverBatching(value?: boolean): NotificationBuilder<TNotification, TState>
  disableDriverBatch(value?: boolean): NotificationBuilder<TNotification, TState>
  onProgress(callback: (completed: number, total: number) => void): NotificationBuilder<TNotification, TState>
}

/**
 * Override channel targets directly (e.g., send to a specific email address).
 */
interface ViaMethod<TNotification extends NotificationClass<any, any>, TState extends BuilderState> {
  via(config: { [K in ChannelName]?: boolean | any }): NotificationBuilder<TNotification, MergeState<TState, { hasVia: true }>>
}

/**
 * params() method type - always available but changes state
 */
interface ParamsMethod<TNotification extends NotificationClass<any, any>, TState extends BuilderState> {
  params(params: ExtractParams<TNotification>): NotificationBuilder<TNotification, MergeState<TState, { hasParams: true }>>
}

/**
 * Set recipients. Accepts single, array, or async iterable. Not available for anonymous notifications.
 */
interface ToMethod<TNotification extends NotificationClass<any, any>, TState extends BuilderState> {
  to(
    recipients:
      | NonNullable<ExtractNotifiable<TNotification>>
      | NonNullable<ExtractNotifiable<TNotification>>[]
      | AsyncIterable<NonNullable<ExtractNotifiable<TNotification>>>,
  ): NotificationBuilder<TNotification, MergeState<TState, { hasTo: true }>>
}

/**
 * send() method type
 */
interface SendMethod {
  send(): Promise<NotificationSendResult>
}

/**
 * Returns true if send() should be available. Requires:
 * - params() called if notification has required params
 * - to() called for non-anonymous, or via() called for anonymous
 */
type CanSend<TNotification extends NotificationClass<any, any>, TState extends BuilderState> =
  HasRequiredParams<TNotification> extends true
    ? TState['hasParams'] extends true
      ? CheckToOrVia<TNotification, TState>
      : false
    : CheckToOrVia<TNotification, TState>

/**
 * Anonymous notifications require via(), non-anonymous require to().
 */
type CheckToOrVia<TNotification extends NotificationClass<any, any>, TState extends BuilderState> =
  IsAnonymous<TNotification> extends true
    ? TState['hasVia'] extends true
      ? true
      : false
    : TState['hasTo'] extends true
      ? true
      : false

/**
 * Fluent builder for sending notifications. Methods appear/disappear based on state.
 */
export type NotificationBuilder<
  TNotification extends NotificationClass<any, any>,
  TState extends BuilderState,
> =
  // Common methods always available
  CommonBuilderMethods<TNotification, TState> &
  // via() always available
  ViaMethod<TNotification, TState> &
  // params() available if not yet set
  (TState['hasParams'] extends true ? {} : ParamsMethod<TNotification, TState>) &
  // to() available only for non-anonymous and if not yet set
  (IsAnonymous<TNotification> extends true
    ? {}
    : TState['hasTo'] extends true
      ? {}
      : ToMethod<TNotification, TState>) &
  // send() available when all requirements are met
  (CanSend<TNotification, TState> extends true ? SendMethod : {})
