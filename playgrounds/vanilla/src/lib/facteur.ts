import { InferChannelsFromConfig } from '@facteurjs/core/types'
import { kyselyAdapter } from '@facteurjs/core/database/adapters/kysely'
import { databaseChannel } from '@facteurjs/core/database'
import { socketIoChannel } from '@facteurjs/core/channels/socketio'
import { discordWebhookChannel } from '@facteurjs/core/channels/discord'
import { awsSnsChannel } from '@facteurjs/core/channels/aws-sns'
import { createFacteur } from '@facteurjs/core'

import { ioServer } from './socketio.js'
import { db } from './db.js'

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
    awsSns: awsSnsChannel({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      region: process.env.AWS_REGION!,
    }),
  },
})

declare module '@facteurjs/core/types' {
  interface NotificationChannels extends InferChannelsFromConfig<typeof facteur> {}
}
