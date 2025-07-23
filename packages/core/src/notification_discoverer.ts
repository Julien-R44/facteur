import { fileURLToPath } from 'node:url'
import { Notification } from '@facteurjs/core/types'
import { fsReadAll, isScriptFile } from '@poppinss/utils'

import { group } from './helpers.js'
import { DuplicateNotificationException } from './errors/duplicate_notification_exception.js'

export interface NotificationDiscovererConfig {
  /**
   * The root directory to search for notifications
   */
  searchDirectory: URL

  /**
   * The file suffix pattern for notification files
   * @default '_notification'
   */
  fileSuffix?: string | undefined
}

/**
 * Discover and load notification classes from the application directory.
 * Ensure that all notification names are unique.
 */
export class NotificationDiscoverer {
  #config: NotificationDiscovererConfig
  #cachedNotifications: Array<new (...args: any[]) => Notification> | null = null

  constructor(config: NotificationDiscovererConfig) {
    this.#config = {
      fileSuffix: config.fileSuffix || '_notification',
      searchDirectory: config.searchDirectory,
    }
  }

  /**
   * Import notification files from the configured directory
   */
  async #importNotifications() {
    const searchDir = this.#config.searchDirectory
    const notificationFiles = await fsReadAll(searchDir, {
      pathType: 'url',
      ignoreMissingRoot: true,
      filter: (file) => {
        const isScript = isScriptFile(file)
        if (!isScript) return false

        const isNodeModule = fileURLToPath(file).includes('/node_modules/')
        if (isNodeModule) return false

        const fileName = file.toString().split('/').pop() || ''
        return (
          fileName.endsWith(`${this.#config.fileSuffix}.ts`) ||
          fileName.endsWith(`${this.#config.fileSuffix}.js`)
        )
      },
    })

    return this.#importNotificationsFromFiles(notificationFiles)
  }

  /**
   * Import notification classes from an array of file paths
   */
  async #importNotificationsFromFiles(files: (URL | string)[]) {
    const promises = files.map(async (file) => {
      const i = await import(file.toString())
      if (!i.default) return { notification: null, file }

      return { notification: i.default, file }
    })

    return Promise.all(promises)
  }

  /**
   * Validate that all notification names are unique and throw if duplicates are found
   */
  #validateUniqueNotificationNames(
    notifications: { notification: new (...args: any[]) => any; file: URL | string }[],
  ) {
    const notificationsByName = group(notifications, (i) => i.notification.name)
    const duplicates = Object.entries(notificationsByName)
      .filter(([_, notifications]) => (notifications?.length || 0) > 1)
      .map(([notificationName, notifications]) => ({ notificationName, notifications }))

    if (duplicates.length > 0) {
      throw new DuplicateNotificationException(this.#config.searchDirectory, duplicates)
    }
  }

  /**
   * Discover and load all notification classes from the configured directory
   */
  async discoverAndLoadNotifications(): Promise<Array<new (...args: any[]) => any>> {
    if (this.#cachedNotifications !== null) return this.#cachedNotifications

    const notifications = await this.#importNotifications()
    const validNotifications = notifications
      .filter((i) => i.notification && typeof i.notification === 'function')
      .filter((i) => i.notification.prototype instanceof Notification)

    this.#validateUniqueNotificationNames(validNotifications)

    this.#cachedNotifications = validNotifications.map(({ notification }) => notification)
    return this.#cachedNotifications
  }

  /**
   * Clear the cache of discovered notifications
   */
  clearCache(): void {
    this.#cachedNotifications = null
  }
}
