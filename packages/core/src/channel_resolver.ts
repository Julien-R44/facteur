import type { FacteurDatabase } from './database/database.js'
import type { Identifier } from './database/types.js'
import type {
  Notification,
  Notifiable,
  NotificationOptions,
  ChannelSpecificConfig,
} from './types.js'
import { mapEntries } from '@julr/utils/object'
import { invoke } from '@julr/utils/functions'
import { is } from '@julr/utils/is'

export interface ResolveChannelsOptions {
  notification: new () => Notification
  notifiable: Notifiable
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

  constructor(database?: FacteurDatabase) {
    this.#database = database || null
  }

  /**
   * Resolve channels and targets provided by via
   */
  #resolveVia(options: ResolveChannelsOptions): ResolvedChannels {
    const notifiableTargets = options.notifiable?.notificationTargets?.()

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
    const { notification, notifiable, params, via, tenantId } = options

    const notificationOptions = (notification as any).options as NotificationOptions<any>
    const notificationIdentifier = notificationOptions.identifier || notification.name
    const notifiableTargets = options.notifiable?.notificationTargets?.()

    /**
     * First, if via is provided it should override everything.
     */
    if (via) return this.#resolveVia(options)

    /**
     * Get preferences for the notifiable and tenant
     */
    const preferences = await this.#database?.getPreferences({
      // @ts-ignore Maybe this .id should be configurable ?
      notifiableId: notifiable.id as Identifier,
      tenantId: tenantId as Identifier,
    })

    /**
     * Resolve channels based on deliverBy options
     */
    const fromDeliverBy = mapEntries(notificationOptions.deliverBy, (channelName, deliverBy) => {
      const shouldSend = invoke(() => {
        if (typeof deliverBy === 'boolean') return deliverBy

        // @ts-ignore
        return deliverBy.if({ notifiable, params, preferences })
      })

      const target = notifiableTargets?.[channelName] || null
      return [channelName, { shouldSend, target }]
    })

    /**
     * And then we can apply user preferences
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
      if (shouldSend === false) {
        return [channelName, { shouldSend: false, target }]
      }

      // Check preferences in priority order (most specific to least specific)
      const preferencesSources = [
        notificationTenantPreference?.channels[channelName],
        tenantPreferences?.channels[channelName],
        notificationGlobalPreference?.channels[channelName],
        globalPreferences?.channels[channelName],
      ]

      shouldSend = preferencesSources.find((preference) => !is.undefined(preference)) ?? shouldSend

      return [channelName, { shouldSend, target }]
    })
  }
}
