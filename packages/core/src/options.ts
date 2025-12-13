import EventEmitter from 'node:events'
import { type Logger, noopLogger } from '@julr/utils/logger'
import { invoke } from '@julr/utils/functions'

import type {
  Emitter,
  QueueAdapter,
  FacteurConfiguration,
  Channel,
  DefaultPreferences,
  ResolvedDefaultPreferences,
  NotificationResolver,
} from './types/index.js'
import type { DatabaseAdapter } from './database/types.js'

import { errors } from './errors/index.js'

export class FacteurOptions<
  KnownChannels extends Record<string, Channel>,
  DBAdapter extends DatabaseAdapter | null = null,
> {
  logger: Logger = noopLogger()
  emitter: Emitter = new EventEmitter()
  channels: KnownChannels
  queueAdapter: QueueAdapter
  databaseAdapter: DBAdapter | null = null
  notificationResolver: NotificationResolver
  readonly defaultPreferences: ResolvedDefaultPreferences<KnownChannels>

  #resolveDefaultPreferences(
    preferences?: DefaultPreferences<KnownChannels>,
  ): ResolvedDefaultPreferences<any> {
    preferences = preferences || {}
    const allChannels = Object.keys(this.channels) as (keyof KnownChannels)[]

    /**
     * Pick global preferences or set all channels to true
     */
    const globalChannelPreferences =
      preferences.global?.channels ||
      Object.fromEntries(allChannels.map((channel) => [channel, true]))

    /**
     * Build categories preferences
     */
    const categories = Object.entries(preferences.categories || {}).map(([category, config]) => {
      const value = invoke(() => {
        // If the category config is a boolean, use the same value for all channels
        if (typeof config === 'boolean') {
          return Object.fromEntries(allChannels.map((channel) => [channel, config]))
        }

        // Otherwise, merge with global preferences
        return Object.assign({}, globalChannelPreferences, config.channels || {})
      })

      return [category, { channels: value }]
    })

    return {
      enabled: preferences.enabled ?? true,
      global: { channels: globalChannelPreferences },
      categories: Object.fromEntries(categories),
    }
  }

  constructor(config: FacteurConfiguration<KnownChannels, DBAdapter>) {
    this.logger = config.logger ?? this.logger
    this.emitter = config.emitter ?? this.emitter
    this.channels = config.channels
    this.databaseAdapter = config.databaseAdapter ?? null
    this.defaultPreferences = this.#resolveDefaultPreferences(config.preferences)
    this.notificationResolver =
      config.notificationResolver || ((notification, ctx) => new notification(ctx))

    const throwIfQueueNotSet = () => {
      throw new errors.E_QUEUE_NOT_SET()
    }

    this.queueAdapter = config.queueAdapter || {
      queue: throwIfQueueNotSet,
      startQueueProcessor: throwIfQueueNotSet,
      disconnect: throwIfQueueNotSet,
    }
  }
}
