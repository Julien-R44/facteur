import { createFacteur } from '@facteurjs/core'
import { discordWebhookChannel } from '@facteurjs/core/channels/discord'
import { databaseChannel } from '@facteurjs/core/database'
import { kyselyAdapter } from '@facteurjs/core/database/adapters/kysely'
import { InferChannelsFromConfig } from '@facteurjs/core/types'
import { db } from './db.js'
import { socketIoChannel } from '@facteurjs/core/channels/socketio'
import { ioServer } from './socketio.js'

export const facteur = createFacteur({
  discoverer: {
    searchDirectory: new URL('./notifications', import.meta.url),
  },
  channels: {
    db: databaseChannel({ adapter: kyselyAdapter({ connection: db }) }),
    socketio: socketIoChannel({ server: ioServer }),
    discord: discordWebhookChannel({
      webhooks: { default: process.env.DISCORD_DEFAULT_WEBHOOK_URL! },
    }),
  },
})

declare module '@facteurjs/core/types' {
  interface NotificationChannels extends InferChannelsFromConfig<typeof facteur> {}
}
