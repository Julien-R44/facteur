import type { Logger } from '@julr/utils/logger'
import type { Arrayable, Awaitable } from '@julr/utils/types'

import type { Facteur } from './facteur.js'
import type { ExtractChannelTargets } from './message.js'

export type FacteurChannelFactory = Channel<any, any, any, any>

export interface QueueItemOptions {
  delay?: number
}

export interface QueueAdapter {
  queue(message: any, options?: QueueItemOptions): Promise<void>
  startQueueProcessor(): void
  disconnect(): void
}

export interface FacteurConfiguration<KnownChannels extends Record<string, Channel>> {
  logger?: Logger
  emitter?: Emitter
  channels: KnownChannels
  queueAdapter?: QueueAdapter
}

export type ChannelSendParams<Message, Targets> = {
  notifiable?: any
  message: Message
  targets?: Targets
}

export const kTargetSymbol = Symbol('facteur:targets')
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface Channel<_Options = any, Message = any, Response = any, Targets = any> {
  [kTargetSymbol]: Targets
  send: (options: ChannelSendParams<Message, Targets>) => Awaitable<Response>
}

type KeyOf<T> = Extract<keyof T, string>

export type CreateMessageParams<
  Notifiable,
  KnownChannels extends Record<string, Channel>,
  Params,
> = {
  name: string
  via?: (options: { notifiable: Notifiable }) => Arrayable<keyof KnownChannels>
} & ChannelsToFunction<KnownChannels, Notifiable, Params>

export type ChannelsToFunction<
  KnownChannels extends Record<string, Channel>,
  Notifiable,
  Params,
> = {
  [K in KeyOf<KnownChannels> as `to${Capitalize<K>}`]?: (options: {
    notifiable: Notifiable
    params: Params
  }) => Parameters<KnownChannels[K]['send']>[0]['message']
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

export type ChannelName = keyof NotificationChannels

export type ProviderTarget<N extends Notifiable, K extends ChannelName> = ExtractChannelTargets<
  NotificationChannels[K]
>

export type ChannelSpecificConfig<N extends Notifiable> = {
  [K in ChannelName]?: boolean | ProviderTarget<N, K>
}

export interface Notifiable {
  notificationTargets?(): NotifiableTargets
}

export type NotifiableTargets = {
  [K in keyof NotificationChannels]?: ExtractChannelTargets<NotificationChannels[K]>
}

export type InferChannelsFromConfig<T> =
  T extends Facteur<infer U> ? U : T extends FacteurConfiguration<infer X> ? X : never
export interface NotificationChannels {}

export abstract class Notification<N extends Notifiable> {
  abstract via(options: ViaParameters<N>): ChannelName[]
}

export interface SendOptions<N extends Notifiable> {
  notification: new (...args: any[]) => Notification<N>
  notifiable: N
  via?: ChannelSpecificConfig<N>
}
