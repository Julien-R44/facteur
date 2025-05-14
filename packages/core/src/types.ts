import type { Logger } from '@julr/utils/logger'
import type { Arrayable, Awaitable } from '@julr/utils/types'

import type { Facteur } from './facteur.js'

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
  emitter?: Emitter
  providers: KnownProviders
  queueAdapter?: QueueAdapter
}

export type ProviderSendParams<Message, Targets> = {
  notifiable?: any
  message: Message
  targets?: Targets
}

export const kTargetSymbol = Symbol('facteur:targets')
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface Provider<_Options = any, Message = any, Response = any, Targets = any> {
  [kTargetSymbol]: Targets
  send: (options: ProviderSendParams<Message, Targets>) => Awaitable<Response>
}

type KeyOf<T> = Extract<keyof T, string>

export type CreateMessageParams<
  Notifiable,
  KnownProviders extends Record<string, Provider>,
  Params,
> = {
  name: string
  via?: (options: { notifiable: Notifiable }) => Arrayable<keyof KnownProviders>
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

/**
 * Class paradigm
 */
export interface ViaParameters<Notifiable> {
  notifiable: Notifiable
}

export type ViaResult = Arrayable<keyof NotificationChannels>

export type InferChannelsFromConfig<T> =
  T extends Facteur<infer U> ? U : T extends FacteurConfiguration<infer X> ? X : never
export interface NotificationChannels {}

export interface Notification<Notifiable> {
  via?(options: { notifiable: Notifiable }): Arrayable<keyof NotificationChannels>
}
