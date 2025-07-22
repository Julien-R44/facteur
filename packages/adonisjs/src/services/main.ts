import app from '@adonisjs/core/services/app'
import type { Facteur } from '@facteurjs/core'
import type { NotificationChannels } from '@facteurjs/core/types'

// eslint-disable-next-line import/no-mutable-exports
let facteur: Facteur<NotificationChannels>

await app?.booted(async () => {
  facteur = await app.container.make('notifications.manager')
})

export { facteur as default }
