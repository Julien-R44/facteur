import type {
  DatabaseAdapter,
  GetNotificationsParams,
  UpdateAllNotificationsParams,
  UpdateNotificationParams,
  GetPreferencesParams,
  Preferences,
  UpdatePreferencesParams,
  RawPreferenceRow,
  NotificationsPreferences,
} from './types.ts'
import type { FacteurOptions } from '../options.ts'
import type { NotificationDiscoverer } from '../notifications/notification_discoverer.ts'

export class FacteurDatabase {
  constructor(
    private options: FacteurOptions<Record<string, any>, DatabaseAdapter>,
    private discoverer: NotificationDiscoverer,
  ) {}

  getNotifications(options: GetNotificationsParams) {
    const page = options.page || 1
    const limit = Math.min(options.limit || 10, 100)

    return this.options.databaseAdapter?.getNotifications({
      page,
      limit,
      tags: options.tags,
      status: options.status,
      tenantId: options.tenantId,
      notifiableId: options.notifiableId,
    })
  }

  updateNotification(option: UpdateNotificationParams) {
    return this.options.databaseAdapter?.updateNotification({
      id: option.id,
      status: option.status,
    })
  }

  updateAllNotifications(options: UpdateAllNotificationsParams) {
    return this.options.databaseAdapter?.updateAllNotifications({
      notifiableId: options.notifiableId,
      tenantId: options.tenantId,
      status: options.status,
    })
  }

  async #createEmptyPreferences(tenantId?: string | number): Promise<Preferences> {
    const globalChannels = this.options.defaultPreferences.global.channels

    const notificationIdentities = await this.discoverer.getNotificationIdentities()
    const notificationPreferences = notificationIdentities.map((identity) => ({
      notification: { name: identity.name, identifier: identity.identifier },
      channels: { ...globalChannels },
    }))

    const preferences: Preferences = {
      global: {
        global: { channels: { ...globalChannels } },
        notifications: [...notificationPreferences],
      },
    }

    if (tenantId) {
      preferences.tenants = {
        [tenantId]: {
          global: { channels: { ...globalChannels } },
          notifications: [...notificationPreferences],
        },
      }
    }

    return preferences
  }

  #processPreferenceRow(row: RawPreferenceRow, preferences: Preferences) {
    const channels = row.channels
    const notificationName = row.notification_name
    const rowTenantId = row.tenant_id

    if (rowTenantId && preferences.tenants?.[rowTenantId]) {
      this.#updateTenantPreferences(preferences.tenants[rowTenantId], notificationName, channels)
    } else if (!rowTenantId) {
      this.#updateGlobalPreferences(preferences.global, notificationName, channels)
    }
  }

  async getPreferences(options: GetPreferencesParams): Promise<Preferences> {
    const rawPreferences = await this.options.databaseAdapter?.getPreferences(options)

    if (!rawPreferences) {
      return await this.#createEmptyPreferences(options.tenantId)
    }

    const preferences = await this.#createEmptyPreferences(options.tenantId)

    for (const row of rawPreferences) {
      this.#processPreferenceRow(row, preferences)
    }

    return preferences
  }

  #updateTenantPreferences(
    tenantPrefs: NotificationsPreferences,
    notificationName: string | null | undefined,
    channels: Record<string, boolean>,
  ) {
    if (!notificationName) {
      Object.assign(tenantPrefs.global.channels, channels)
    } else {
      this.#updateNotificationPreferences(tenantPrefs.notifications, notificationName, channels)
    }
  }

  #updateGlobalPreferences(
    globalPrefs: NotificationsPreferences,
    notificationName: string | null | undefined,
    channels: Record<string, boolean>,
  ) {
    if (!notificationName) {
      Object.assign(globalPrefs.global.channels, channels)
    } else {
      this.#updateNotificationPreferences(globalPrefs.notifications, notificationName, channels)
    }
  }

  #updateNotificationPreferences(
    notifications: NotificationsPreferences['notifications'],
    notificationName: string,
    channels: Record<string, boolean>,
  ) {
    let notificationPref = notifications.find(
      (n) => n.notification.name === notificationName || n.notification.identifier === notificationName,
    )

    if (!notificationPref) {
      notificationPref = {
        notification: { name: notificationName, identifier: notificationName },
        channels: {} as Record<string, boolean>,
      }
      notifications.push(notificationPref)
    }

    Object.assign(notificationPref.channels, channels)
  }

  updatePreferences(options: UpdatePreferencesParams) {
    return this.options.databaseAdapter?.updatePreferences(options)
  }
}
