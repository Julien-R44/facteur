import app from '@adonisjs/core/services/app'
import type { NotificationChannels } from '@facteurjs/core/types'

import type { NotificationManager } from '../manager.js'

// eslint-disable-next-line import/no-mutable-exports
let facteur: NotificationManager<NotificationChannels, null>

await app?.booted(async () => {
  facteur = await app.container.make('notifications.manager')
})

export { facteur as default }
