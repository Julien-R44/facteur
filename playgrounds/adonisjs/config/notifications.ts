import type { InferChannels } from '@facteurjs/adonisjs/types'

import { databases } from '@facteurjs/adonisjs/database'
import { defineConfig, channels } from '@facteurjs/adonisjs'

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
      ignoredErrorCodes: [21_608, 21_211, 21_614, 21_408],
    }),
    fcm: channels.fcm({
      serviceAccountKeyPath: process.env.FCM_SERVICE_ACCOUNT_KEY_PATH,
      projectId: process.env.FCM_PROJECT_ID,
      debugToken: process.env.FCM_DEBUG_TOKEN,
    }),
    webpush: channels.webpush({
      vapidSubject: 'https://facteur.julr.dev',
      vapidPublicKey: process.env.WEBPUSH_VAPID_PUBLIC_KEY!,
      vapidPrivateKey: process.env.WEBPUSH_VAPID_PRIVATE_KEY!,
      ttl: 60 * 60 * 24,
      urgency: 'normal',
    }),
  },

  preferences: {
    global: {
      channels: {
        fcm: true,
        database: true,
        transmit: true,
        mail: true,
        slack: true,
        discord: true,
        twilio: true,
        webpush: true,
      },
    },

    categories: {
      billing: false,
      marketing: {
        channels: {
          mail: true,
          slack: true,
          twilio: true,
          fcm: false,
          discord: false,
          webpush: false,
        },
      },
    },
  },
})

export default config

declare module '@facteurjs/adonisjs/types' {
  interface NotificationChannels extends InferChannels<typeof config> {}
}
