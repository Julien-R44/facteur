import type { Duration } from '@julr/tenace/types'

import type { NotificationClass, NotificationSendResult } from '../types/notifications.ts'
import type {
  ExtractParams,
  ExtractNotifiable,
  ChannelSpecificConfig,
  NotificationQueueOptions,
} from '../types/options.ts'
import type { Identifier } from '../database/types.ts'
import type {
  BuilderOptions,
  BuilderState,
  NotificationBuilder as NotificationBuilderType,
} from '../types/builder.ts'

type SendFn = (options: BuilderOptions<any>) => Promise<NotificationSendResult>

/**
 * Fluent builder for sending notifications.
 * Provides a chainable API with full type-safety.
 */
export class NotificationBuilderImpl<
  TNotification extends NotificationClass<any, any>,
  TState extends BuilderState = { hasParams: false; hasTo: false; hasVia: false },
> {
  #options: BuilderOptions<TNotification>
  #sendFn: SendFn

  constructor(sendFn: SendFn, notification: TNotification) {
    this.#sendFn = sendFn
    this.#options = { notification }
  }

  params(params: ExtractParams<TNotification>): NotificationBuilderImpl<TNotification, TState & { hasParams: true }> {
    this.#options.params = params
    return this as any
  }

  to(
    recipients:
      | NonNullable<ExtractNotifiable<TNotification>>
      | NonNullable<ExtractNotifiable<TNotification>>[]
      | AsyncIterable<NonNullable<ExtractNotifiable<TNotification>>>,
  ): NotificationBuilderImpl<TNotification, TState & { hasTo: true }> {
    this.#options.to = recipients as any
    return this as any
  }

  via(config: ChannelSpecificConfig<any>): NotificationBuilderImpl<TNotification, TState & { hasVia: true }> {
    this.#options.via = config
    return this as any
  }

  tenant(id: Identifier): NotificationBuilderImpl<TNotification, TState> {
    this.#options.tenantId = id
    return this
  }

  chunkSize(size: number): NotificationBuilderImpl<TNotification, TState> {
    this.#options.chunkSize = size
    return this
  }

  concurrency(limit: number): NotificationBuilderImpl<TNotification, TState> {
    this.#options.concurrency = limit
    return this
  }

  continueOnError(value = true): NotificationBuilderImpl<TNotification, TState> {
    this.#options.continueOnError = value
    return this
  }

  retries(count: number): NotificationBuilderImpl<TNotification, TState> {
    this.#options.retries = count
    return this
  }

  timeout(duration: Duration): NotificationBuilderImpl<TNotification, TState> {
    this.#options.timeout = duration
    return this
  }

  throwOnError(value = true): NotificationBuilderImpl<TNotification, TState> {
    this.#options.throwOnError = value
    return this
  }

  useDriverBatching(value = true): NotificationBuilderImpl<TNotification, TState> {
    this.#options.useDriverBatching = value
    return this
  }

  disableDriverBatch(value = true): NotificationBuilderImpl<TNotification, TState> {
    this.#options.disableDriverBatch = value
    return this
  }

  onProgress(callback: (completed: number, total: number) => void): NotificationBuilderImpl<TNotification, TState> {
    this.#options.onProgress = callback
    return this
  }

  async queue(options?: NotificationQueueOptions): Promise<NotificationSendResult> {
    this.#options.queueMode = true
    if (options) this.#options.queueOptions = options
    return this.#sendFn(this.#options)
  }

  async send(): Promise<NotificationSendResult> {
    return this.#sendFn(this.#options)
  }
}

/**
 * Create a new notification builder with proper typing
 */
export function createNotificationBuilder<TNotification extends NotificationClass<any, any>>(
  sendFn: SendFn,
  notification: TNotification,
): NotificationBuilderType<TNotification, { hasParams: false; hasTo: false; hasVia: false }> {
  return new NotificationBuilderImpl(sendFn, notification) as any
}
