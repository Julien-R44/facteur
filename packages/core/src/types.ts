import type EventEmitter from 'node:events'
import type { Logger } from '@julr/utils/logger'
import type { Arrayable, Awaitable } from '@julr/utils/types'

export interface FacteurProviderFactory {
  name: string
  provider: Provider<any, any, any>
}

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

export interface Provider<Notifiable, Message, Response> {
  send: (options: { notifiable: Notifiable; message: Message }) => Awaitable<Response>
}

export type CreateMessageParams<Notifiable, Providers extends FacteurProviderFactory, Params> = {
  name: string
  via: (notifiable: Notifiable) => Arrayable<Providers['name']>
} & ProvidersToFunctions<Providers, Notifiable, Params>

export type ProvidersToFunctions<Providers extends FacteurProviderFactory, Notifiable, Params> = {
  [K in Providers['name'] as `to${Capitalize<K>}`]?: (options: {
    notifiable: Notifiable
    params: Params
  }) => Parameters<Providers['provider']['send']>[0]['message']
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

// export type Message<T> = {
//   via(notifiable: any): Arrayable<string>
// } & ProvidersToFunctions<any, any, any>

export type ToProviderParams<Params> = {
  notifiable: any
  params: Params
}
