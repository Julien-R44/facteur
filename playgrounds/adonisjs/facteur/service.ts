import app from '@adonisjs/core/services/app'
import { Facteur } from '@facteurjs/adonisjs'
import { NotificationChannels } from '@facteurjs/adonisjs/types'

let facteur: Facteur<NotificationChannels>

await app?.booted(async () => {
  facteur = await app.container.make('notifications.manager')
})

export { facteur as default }
