import type { Provider } from '@facteurjs/core/types'

import type { SlackOptions } from './src/types.js'
import type { SlackMessage } from './src/message.js'

export function slackWebhookProvider<Options extends SlackOptions<any>>(options: Options) {
  return new SlackProvider(options)
}

type SlackProviderInterface = Provider<SlackOptions<any>, SlackMessage, any, SlackTargets<any>>

class SlackProvider implements SlackProviderInterface {
  name = 'slack' as const
  #webhooksUrls: Map<string, URL> = new Map()

  #initWebhooksEndpoints(options: DiscordOptions<any>) {
    if ('webhookUrl' in options) {
      this.#webhooksUrls.set(...this.#buildWebhookEntry('default', options.webhookUrl))
      return
    }

    if (!options.webhooks) return

    for (const [key, endpoint] of Object.entries(options.webhooks)) {
      this.#webhooksUrls.set(key, new URL(endpoint))
    }
  }

  constructor(options: SlackOptions<any>) {
    this.#initWebhooksEndpoints(options)
  }

  send: (options: { notifiable: any; message: SlackMessage }) => any
}
