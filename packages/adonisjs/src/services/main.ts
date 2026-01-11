import app from '@adonisjs/core/services/app'

import type { NotificationChannels } from '../types.ts'
import type { NotificationManager } from '../manager.ts'

// @ts-ignore
let facteur: NotificationManager<NotificationChannels, null>

await app?.booted(async () => {
  facteur = await app.container.make('notifications.manager')
})

export { facteur as default }
