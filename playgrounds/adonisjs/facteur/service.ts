import app from '@adonisjs/core/services/app'
import { Facteur } from '@facteurjs/core'

let facteur: Facteur<any>

await app?.booted(async () => {
  facteur = await app.container.make('notifications.manager')
})

export { facteur as default }
