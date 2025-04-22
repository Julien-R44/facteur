import type EventEmitter from 'node:events'
import type { Logger } from '@julr/utils/logger'
import type { Arrayable, Awaitable } from '@julr/utils/types'

export type FacteurProviderFactory = Provider<any, any, any, any>

export interface QueueItemOptions {
  delay?: number
}

export interface QueueAdapter {
  queue(message: any, options?: QueueItemOptions): Promise<void>
  startQueueProcessor(): void
  disconnect(): void
}

export interface FacteurConfiguration<KnownProviders extends Record<string, Provider>> {
  logger?: Logger
  emitter?: EventEmitter
  providers: KnownProviders
  queueAdapter?: QueueAdapter
}

// TODO must be added to eslint default config
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface Provider<_Options = any, Message = any, Response = any, _Targets = any> {
  // targets: _Targets
  send: (options: { notifiable: any; message: Message }) => Awaitable<Response>
}

type KeyOf<T> = Extract<keyof T, string>

export type CreateMessageParams<
  Notifiable,
  KnownProviders extends Record<string, Provider>,
  Params,
> = {
  name: string
  via?: (notifiable: Notifiable) => Arrayable<keyof KnownProviders>
} & ProvidersToFunctions<KnownProviders, Notifiable, Params>

export type ProvidersToFunctions<
  KnownProviders extends Record<string, Provider>,
  Notifiable,
  Params,
> = {
  [K in KeyOf<KnownProviders> as `to${Capitalize<K>}`]?: (options: {
    notifiable: Notifiable
    params: Params
  }) => Parameters<KnownProviders[K]['send']>[0]['message']
}

/**
 * Shape of the emitter accepted by facteur
 * Should be compatible with node's EventEmitter and Emittery
 */
export interface Emitter {
  on: (event: string, callback: (...values: any[]) => void) => void
  once: (event: string, callback: (...values: any[]) => void) => void
  off: (event: string, callback: (...values: any[]) => void) => void
  emit: (event: string, ...values: any[]) => void
}

export type ToProviderParams<Params> = {
  notifiable: any
  params: Params
}

export type ProvidersToTargets<KnownProviders extends Record<string, Provider>> = {
  [K in keyof KnownProviders]?: KnownProviders[K] extends Provider<any, any, any, infer T>
    ? T
    : never
}
