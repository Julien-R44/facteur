import type { NotificationChannels } from '@facteurjs/core/types'
import type { DatabaseAdapter } from '@facteurjs/core/database/types'

import app from '@adonisjs/core/services/app'

import type { NotificationManager } from '../manager.ts'
import type { NotificationsDatabase } from '../types.ts'

type RegisteredChannels = {
  [Name in keyof NotificationChannels]: NotificationChannels[Name]
}

/**
 * Falls back to `DatabaseAdapter` when the app does not augment `NotificationsDatabase`.
 * `facteur.db` then throws at runtime if no `databaseAdapter` is configured.
 */
type RegisteredDatabaseAdapter = NotificationsDatabase extends {
  adapter: infer Adapter extends DatabaseAdapter | null
}
  ? Adapter
  : DatabaseAdapter

let facteur: NotificationManager<RegisteredChannels, RegisteredDatabaseAdapter>

await app?.booted(async () => {
  facteur = await app.container.make('notifications.manager')
})

export { facteur as default }
