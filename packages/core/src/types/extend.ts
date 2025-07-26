import type { Facteur } from '../facteur.js'
import type { FacteurConfiguration } from './options.js'

/**
 * List of available channels
 */
export type ChannelName = keyof NotificationChannels

/**
 * The list of channels configured in the Facteur instance. This must
 * be extended user-land with module augmentation
 */
export interface NotificationChannels {}

/**
 * Infer the channels from the Facteur instance
 */
export type InferChannelsFromConfig<T> =
  T extends Facteur<infer U> ? U : T extends FacteurConfiguration<infer X> ? X : never
