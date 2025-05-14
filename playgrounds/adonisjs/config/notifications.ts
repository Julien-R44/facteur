import { defineConfig, InferChannels } from '../facteur/define_config.js'
import { channels } from '../facteur/channels.js'

const webhooks = {
  slack: 'https://hooks.slack.com/services/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',
  discord:
    'https://discord.com/api/webhooks/1371596880093380710/Y18O5mrWy4vZWowe5NdmM1F_VuFJQqc7_UvnniZCfgsf_rTAAJaBzKHBPxtOXT-JXljd',
}

const config = defineConfig({
  channels: {
    database: channels.database({ connectionName: 'sqlite' }),
    slack: channels.slackWebhook({ webhooks: { default: webhooks.slack } }),
    discord: channels.discordWebhook({ webhooks: { default: webhooks.discord } }),
  },
})

export default config

declare module '@facteurjs/core/types' {
  interface NotificationChannels extends InferChannels<typeof config> {}
}
