import app from '@adonisjs/core/services/app'

import type { NotificationChannels } from '../types.js'
import type { NotificationManager } from '../manager.js'

// @ts-ignore
let facteur: NotificationManager<NotificationChannels, null>

await app?.booted(async () => {
  facteur = await app.container.make('notifications.manager')
})

export { facteur as default }
