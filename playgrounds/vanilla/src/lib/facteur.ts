import { createFacteur } from '@facteurjs/core'
import { discordWebhookChannel } from '@facteurjs/core/channels/discord'
import { InferChannelsFromConfig } from '@facteurjs/core/types'

export const facteur = createFacteur({
  discoverer: {
    searchDirectory: new URL('./notifications', import.meta.url),
  },
  channels: {
    discord: discordWebhookChannel({
      webhooks: { default: process.env.DISCORD_DEFAULT_WEBHOOK_URL! },
    }),
  },
})

declare module '@facteurjs/core/types' {
  interface NotificationChannels extends InferChannelsFromConfig<typeof facteur> {}
}
