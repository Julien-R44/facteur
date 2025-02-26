import { invoke } from '@julr/utils/functions'
import type { Provider } from '@facteurjs/core/types'

import type { DiscordMessage } from './message.js'
import type { DiscordOptions, DiscordResponse, DiscordTargets } from './types.js'

export function discordWebhookProvider<Options extends DiscordOptions<any>>(options: Options) {
  return new DiscordProvider(options)
}

type DiscordProviderInterface = Provider<
  DiscordOptions<any>,
  DiscordMessage,
  DiscordResponse,
  DiscordTargets<any>
>

class DiscordProvider implements DiscordProviderInterface {
  name = 'discord' as const
  #webhooksUrls: Map<string, URL> = new Map()

  #buildWebhookEntry(key: string, endpoint: string) {
    const url = new URL(endpoint)
    url.searchParams.set('wait', 'true')

    return [key, url] as const
  }

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

  constructor(options: DiscordOptions<any>) {
    this.#initWebhooksEndpoints(options)
  }

  async #sendMessageToWebhook(url: URL, message: DiscordMessage) {
    await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message.serialize()),
    })
  }

  #normalizeTargets(targets: DiscordTargets<any>) {
    if (!targets) return [...this.#webhooksUrls.values()]

    if ('webhookUrl' in targets) {
      return [this.#buildWebhookEntry('default', targets.webhookUrl)[1]]
    }

    return Object.keys(targets)
      .map(([key]) => this.#webhooksUrls.get(key)!)
      .filter(Boolean)
  }

  async send(params: { notifiable: any; message: DiscordMessage; targets?: DiscordTargets<any> }) {
    const { notifiable, message } = params

    const targets = invoke<DiscordTargets<any>>(() => {
      if (notifiable.notificationTargetForDiscord) {
        return notifiable.notificationTargetForDiscord()
      }

      return params.targets
    })

    const normalizedTargets = this.#normalizeTargets(targets)
    for (const url of normalizedTargets) {
      console.log('Sending message to', url)
      await this.#sendMessageToWebhook(url, message)
    }

    // TODO
    return null as any
  }
}
