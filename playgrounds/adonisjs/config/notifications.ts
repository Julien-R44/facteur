import { defineConfig, channels } from '@facteurjs/adonisjs'
import { InferChannels } from '@facteurjs/adonisjs/types'
import { databases } from '@facteurjs/adonisjs/database'

const config = defineConfig({
  databaseAdapter: databases.lucid({ connectionName: 'sqlite' }),
  channels: {
    transmit: channels.transmit(),
    database: channels.database({ connectionName: 'sqlite' }),
    slack: channels.slackWebhook({ webhooks: { default: process.env.SLACK_WEBHOOK_URL! } }),
    mail: channels.mail(),
    discord: channels.discordWebhook({
      webhooks: {
        default: process.env.DISCORD_DEFAULT_WEBHOOK_URL!,
        marketing: process.env.DISCORD_MARKETING_WEBHOOK_URL!,
      },
    }),
    twilio: channels.twilio({
      accountSid: process.env.TWILIO_ACCOUNT_SID!,
      authToken: process.env.TWILIO_AUTH_TOKEN!,
      from: process.env.TWILIO_FROM,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
      debugTo: process.env.TWILIO_DEBUG_TO,
      ignoredErrorCodes: [21608, 21211, 21614, 21408], // Common test error codes
    }),
  },
})

export default config

declare module '@facteurjs/adonisjs/types' {
  interface NotificationChannels extends InferChannels<typeof config> {}
}
