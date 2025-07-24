import app from '@adonisjs/core/services/app'
import type { NotificationManager } from '@facteurjs/adonisjs'
import type { NotificationChannels } from '@facteurjs/adonisjs/types'

let facteur: NotificationManager<NotificationChannels>

await app?.booted(async () => {
  facteur = await app.container.make('notifications.manager')
})

export { facteur as default }
