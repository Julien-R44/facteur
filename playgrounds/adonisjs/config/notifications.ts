import { InferChannelsFromConfig } from '@facteurjs/core/types'
import { defineConfig } from '../facteur/define_config.js'
import { discordWebhookProvider } from '@facteurjs/discord'

const config = defineConfig({
  providers: {
    discord: discordWebhookProvider({
      webhooks: {
        default:
          'https://discord.com/api/webhooks/1371596880093380710/Y18O5mrWy4vZWowe5NdmM1F_VuFJQqc7_UvnniZCfgsf_rTAAJaBzKHBPxtOXT-JXljd',
      },
    }),
  },
})

export default config

declare module '@facteurjs/core/types' {
  interface NotificationChannels extends InferChannelsFromConfig<typeof config> {}
}
