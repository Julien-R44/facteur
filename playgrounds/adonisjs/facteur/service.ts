import app from '@adonisjs/core/services/app'
import { NotificationManager } from '@facteurjs/adonisjs'
import { NotificationChannels } from '@facteurjs/adonisjs/types'

let facteur: NotificationManager<NotificationChannels>

await app?.booted(async () => {
  facteur = await app.container.make('notifications.manager')
})

export { facteur as default }
