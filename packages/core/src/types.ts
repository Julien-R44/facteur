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

export interface FacteurConfiguration<Providers extends FacteurProviderFactory> {
  logger?: Logger
  emitter?: EventEmitter
  providers: Array<Providers>
  queueAdapter?: QueueAdapter
}

// TODO must be added to eslint default config
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface Provider<_Options, Message, Response, _Targets> {
  name: string
  send: (options: { notifiable: any; message: Message }) => Awaitable<Response>
}

export type CreateMessageParams<Notifiable, Providers extends FacteurProviderFactory, Params> = {
  name: string
  via?: (notifiable: Notifiable) => Arrayable<Providers['name']>
} & ProvidersToFunctions<Providers, Notifiable, Params>

export type ProvidersToFunctions<Providers extends FacteurProviderFactory, Notifiable, Params> = {
  [K in Providers['name'] as `to${Capitalize<K>}`]?: (options: {
    notifiable: Notifiable
    params: Params
  }) => Parameters<Providers['send']>[0]['message']
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

export type ProvidersToTargets<Providers extends FacteurProviderFactory> = {
  [K in Providers['name']]?: Extract<Providers, { name: K }> extends { provider: infer P }
    ? P extends Provider<any, any, any, infer T>
      ? T
      : never
    : never
}
