import type { Channel } from './channel.js'

type ChannelPreferences<KnownChannels extends Record<string, Channel>> = Record<
  keyof KnownChannels,
  boolean
>

/**
 * Shape for the `preferences` option in facteur configuration
 */
export interface DefaultPreferences<KnownChannels extends Record<string, Channel>> {
  /**
   * If false, user preferences will not be taken into account before sending notifications.
   */
  enabled?: boolean

  /**
   * Global preferences for all notifications.
   */
  global?: { channels?: ChannelPreferences<KnownChannels> }

  /**
   * Per-category preferences.
   * Use `Notification.options.category` to define category on a notification.
   */
  categories?: Record<string, { channels?: Partial<ChannelPreferences<KnownChannels>> } | boolean>
}

/**
 * Shape for the resolved/processed `preferences` option in facteur configuration
 */
export interface ResolvedDefaultPreferences<KnownChannels extends Record<string, Channel>> {
  enabled: boolean
  global: { channels: ChannelPreferences<KnownChannels> }
  categories: Record<string, { channels: ChannelPreferences<KnownChannels> }>
}
