import { mapEntries } from '@julr/utils/object'
import { is } from '@julr/utils/is'
import { invoke } from '@julr/utils/functions'

import type {
  Notification,
  Notifiable,
  NotificationOptions,
  ChannelSpecificConfig,
  ResolvedDefaultPreferences,
  Channel,
  DeliverByOptions,
} from '../types/index.ts'
import type { Identifier } from '../database/types.ts'
import type { FacteurDatabase } from '../database/database.ts'

export interface ResolveChannelsOptions {
  notification: new (...args: any[]) => Notification<any, any>
  to?: Notifiable | undefined
  params: any
  via?: ChannelSpecificConfig<any>
  tenantId?: Identifier
}

export interface ResolvedChannel {
  shouldSend: boolean
  target: any | null
}

export type ResolvedChannels = Record<string, ResolvedChannel>

export class ChannelResolver {
  #database: FacteurDatabase | null = null
  #defaultPreferences: ResolvedDefaultPreferences<Record<string, Channel>> | null = null

  constructor(
    database?: FacteurDatabase,
    defaultPreferences?: ResolvedDefaultPreferences<Record<string, Channel>>,
  ) {
    this.#database = database || null
    this.#defaultPreferences = defaultPreferences || null
  }

  /**
   * Resolve channels and targets provided by via
   */
  #resolveVia(options: ResolveChannelsOptions): ResolvedChannels {
    const notifiableTargets = options.to?.notificationTargets?.()

    return mapEntries(options.via!, (channelName, channelConfig) => {
      const shouldSend = typeof channelConfig === 'boolean' ? channelConfig : true
      const target = invoke(() => {
        if (typeof channelConfig === 'object') return channelConfig

        return notifiableTargets?.[channelName] || null
      })

      return [channelName, { shouldSend, target }]
    })
  }

  async resolveChannels(options: ResolveChannelsOptions): Promise<ResolvedChannels> {
    const { notification, to, params, via, tenantId } = options

    const notificationOptions = (notification as any).options as NotificationOptions<any>
    const notificationIdentifier = notificationOptions.identifier || notification.name
    const notifiableTargets = options.to?.notificationTargets?.()

    /**
     * First, if via is provided it should override everything.
     */
    if (via) return this.#resolveVia(options)

    /**
     * Resolve channels based on deliverBy options
     */
    const fromDeliverBy = mapEntries(notificationOptions.deliverBy, (channelName, deliverBy) => {
      const shouldSend = invoke(() => {
        if (typeof deliverBy === 'boolean') return deliverBy
        if (!to) return true
        return (deliverBy as DeliverByOptions).if({ to, params })
      })

      const target = notifiableTargets?.[channelName] || null
      return [channelName, { shouldSend, target }]
    })

    /**
     * If the notification is critical, bypass all user preferences
     */
    if (notificationOptions.critical) return fromDeliverBy

    /**
     * Get preferences for the notifiable and tenant.
     * Skip if no notifiable (anonymous notification) or no database.
     */
    const notifiableId = (to as any)?.id as Identifier | undefined
    const preferences = notifiableId
      ? await this.#database?.getPreferences({
          notifiableId,
          tenantId: tenantId as Identifier,
        })
      : undefined

    /**
     * Get category preferences from default config
     */
    const category = notificationOptions.category
    const categoryPreferences = category
      ? this.#defaultPreferences?.categories[category]?.channels
      : undefined

    /**
     * Apply user preferences with priority order
     */
    const currentTenant = preferences?.tenants?.[tenantId || -1]
    const tenantPreferences = currentTenant?.global
    const globalPreferences = preferences?.global.global

    const notificationTenantPreference = currentTenant?.notifications?.find(
      ({ notification }) => notification.identifier === notificationIdentifier,
    )
    const notificationGlobalPreference = preferences?.global.notifications.find(
      ({ notification }) => notification.identifier === notificationIdentifier,
    )

    return mapEntries(fromDeliverBy, (channelName, { shouldSend, target }) => {
      if (shouldSend === false) return [channelName, { shouldSend: false, target }]

      /**
       * Check preferences in priority order (most specific to least specific):
       * 1. Notification-specific tenant preference
       * 2. Tenant global preference
       * 3. Notification-specific global preference
       * 4. Global user preference
       * 5. Category preference (from default config)
       */
      const preferencesSources = [
        notificationTenantPreference?.channels[channelName],
        tenantPreferences?.channels[channelName],
        notificationGlobalPreference?.channels[channelName],
        globalPreferences?.channels[channelName],
        categoryPreferences?.[channelName],
      ]

      shouldSend = preferencesSources.find((preference) => !is.undefined(preference)) ?? shouldSend

      return [channelName, { shouldSend, target }]
    })
  }
}
