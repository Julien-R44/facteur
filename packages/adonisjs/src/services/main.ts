import type { NotificationChannels } from '@facteurjs/core/types'

import app from '@adonisjs/core/services/app'

import type { NotificationManager } from '../manager.ts'

type RegisteredChannels = {
  [Name in keyof NotificationChannels]: NotificationChannels[Name]
}

let facteur: NotificationManager<RegisteredChannels, null>

await app?.booted(async () => {
  facteur = await app.container.make('notifications.manager')
})

export { facteur as default }
