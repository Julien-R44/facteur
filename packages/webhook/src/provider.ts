import { invoke } from '@julr/utils/functions'
import { capitalize } from '@julr/utils/string'
import type { Provider } from '@facteurjs/core/types'

import type { WebhookMessage } from './message.js'
import type { WebhookOptions, WebhookTargets } from './types.js'

export function webhookProvider<Options extends WebhookOptions<any>>(options: Options) {
  return new WebhookProvider(options)
}

type WebhookProviderInterface<T extends string> = Provider<
  WebhookOptions<T>,
  WebhookMessage,
  any,
  WebhookTargets<any>
>

export class WebhookProvider {
  name: string
  #webhooksUrls: Map<string, URL> = new Map()

  constructor(options: WebhookOptions<any>) {
    this.name = options.name
    this.#initWebhooksEndpoints(options)
  }

  #buildWebhookEntry(key: string, endpoint: string) {
    const url = new URL(endpoint)
    return [key, url] as const
  }

  #initWebhooksEndpoints(options: WebhookOptions<any>) {
    if ('webhookUrl' in options) {
      this.#webhooksUrls.set(...this.#buildWebhookEntry('default', options.webhookUrl))
      return
    }

    if (!options.webhooks) return

    for (const [key, endpoint] of Object.entries(options.webhooks)) {
      this.#webhooksUrls.set(key, new URL(endpoint))
    }
  }

  async #sendMessageToWebhook(url: URL, message: WebhookMessage) {
    const serialized = message.serialize()

    Object.entries(serialized.queryParameters).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })

    await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...serialized.headers },
      body: JSON.stringify(serialized.body),
    })
  }

  #normalizeTargets(targets: WebhookTargets<any>) {
    if (!targets) return [...this.#webhooksUrls.values()]

    if ('webhookUrl' in targets) {
      return [this.#buildWebhookEntry('default', targets.webhookUrl)[1]]
    }

    return Object.keys(targets)
      .map(([key]) => this.#webhooksUrls.get(key)!)
      .filter(Boolean)
  }

  async send(params: { notifiable: any; message: WebhookMessage; targets?: WebhookTargets<any> }) {
    const { notifiable, message } = params

    const targets = invoke<WebhookTargets<any>>(() => {
      if (notifiable[`notificationTargetFor${capitalize(this.name)}`]) {
        return notifiable[`notificationTargetFor${capitalize(this.name)}`]()
      }

      return params.targets
    })

    const normalizedTargets = this.#normalizeTargets(targets)
    for (const url of normalizedTargets) {
      await this.#sendMessageToWebhook(url, message)
    }

    // TODO
    return null as any
  }
}
