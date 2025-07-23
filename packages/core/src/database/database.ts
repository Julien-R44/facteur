import type { FacteurOptions } from '../options.js'
import type {
  DatabaseAdapter,
  GetNotificationsParams,
  UpdateAllNotificationsParams,
  UpdateNotificationParams,
  GetPreferencesParams,
  Preferences,
  UpdatePreferencesParams,
} from './types.js'

export class FacteurDatabase {
  constructor(private options: FacteurOptions<any, DatabaseAdapter>) {}

  getNotifications(options: GetNotificationsParams) {
    const page = options.page || 1
    const limit = Math.min(options.limit || 10, 100)

    return this.options.databaseAdapter?.getNotifications({
      page,
      limit,
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

  async getPreferences(options: GetPreferencesParams): Promise<Preferences> {
    const rawPreferences = await this.options.databaseAdapter?.getPreferences(options)

    if (!rawPreferences) {
      return this.#createEmptyPreferences(options.tenantId)
    }

    const preferences = this.#createEmptyPreferences(options.tenantId)

    for (const row of rawPreferences) {
      this.#processPreferenceRow(row, preferences, options.tenantId)
    }

    return preferences
  }

  #createEmptyPreferences(tenantId?: string | number): Preferences {
    const preferences: Preferences = {
      global: {
        global: { channels: {} },
        notifications: [],
      },
    }

    if (tenantId) {
      preferences.tenants = {
        [tenantId]: {
          global: { channels: {} },
          notifications: [],
        },
      }
    }

    return preferences
  }

  #processPreferenceRow(row: any, preferences: Preferences, tenantId?: string | number) {
    const channels = row.channels
    const notificationName = row.notification_name

    if (tenantId && preferences.tenants) {
      this.#updateTenantPreferences(preferences.tenants[tenantId], notificationName, channels)
    } else {
      this.#updateGlobalPreferences(preferences.global, notificationName, channels)
    }
  }

  #updateTenantPreferences(
    tenantPrefs: any,
    notificationName: string | null,
    channels: Record<string, boolean>,
  ) {
    if (!notificationName) {
      Object.assign(tenantPrefs.global.channels, channels)
    } else {
      this.#updateNotificationPreferences(tenantPrefs.notifications, notificationName, channels)
    }
  }

  #updateGlobalPreferences(
    globalPrefs: any,
    notificationName: string | null,
    channels: Record<string, boolean>,
  ) {
    if (!notificationName) {
      Object.assign(globalPrefs.global.channels, channels)
    } else {
      this.#updateNotificationPreferences(globalPrefs.notifications, notificationName, channels)
    }
  }

  #updateNotificationPreferences(
    notifications: any[],
    notificationName: string,
    channels: Record<string, boolean>,
  ) {
    let notifPref = notifications.find((n) => n.notification.name === notificationName)

    if (!notifPref) {
      notifPref = {
        notification: { name: notificationName },
        channels: {},
      }
      notifications.push(notifPref)
    }

    Object.assign(notifPref.channels, channels)
  }

  updatePreferences(options: UpdatePreferencesParams) {
    return this.options.databaseAdapter?.updatePreferences(options)
  }
}
