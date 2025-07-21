import app from '@adonisjs/core/services/app'
import { Facteur } from '@facteurjs/core'
import { NotificationChannels } from '@facteurjs/core/types'

let facteur: Facteur<NotificationChannels>

await app?.booted(async () => {
  facteur = await app.container.make('notifications.manager')
})

export { facteur as default }
