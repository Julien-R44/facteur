import ky, { HTTPError } from 'ky'

import type { WebhookMessage } from './message.js'
import { WebhookRequestException } from './exceptions.js'
import { HTTPErrorExtractor } from '../../errors/http_error.js'
import type { WebhookOptions, WebhookTargets } from './types.js'
import { kTargetSymbol, type Channel, type ChannelSendParams } from '../../types/index.js'
import { errors } from '../../errors/index.js'

export function webhookChannel<Options extends WebhookOptions<any>>(
  options: Options & { name: string },
) {
  return new WebhookChannel(options)
}

export class WebhookChannel<T extends WebhookOptions<any>>
  implements Channel<T, WebhookMessage, any, WebhookTargets<T>>
{
  name = 'webhook' as const;
  [kTargetSymbol] = null as any as WebhookTargets<T>
  #webhooksUrls: Map<string, URL> = new Map()
  #name: string

  constructor(options: T & { name: string }) {
    this.#name = options.name
    this.#initWebhooksEndpoints(options)
  }

  #buildWebhookEntry(key: string, endpoint: string) {
    const url = new URL(endpoint)
    return [key, url] as const
  }

  #initWebhooksEndpoints(options: T) {
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

    return await ky
      .post(url, {
        searchParams: serialized.queryParameters,
        headers: serialized.headers,
        json: serialized.body,
      })
      .catch(async (error) => {
        if (error instanceof HTTPError) {
          throw new WebhookRequestException(await HTTPErrorExtractor.extract(error))
        }
        throw error
      })
  }

  #normalizeTargets(targets: WebhookTargets<any>) {
    if (!targets) return [...this.#webhooksUrls.values()]

    if ('webhookUrl' in targets) {
      return [this.#buildWebhookEntry('default', targets.webhookUrl)[1]]
    }

    return Object.keys(targets)
      .map((key) => this.#webhooksUrls.get(key)!)
      .filter(Boolean)
  }

  #resolveTargets(
    options: ChannelSendParams<WebhookMessage, WebhookTargets<T>>,
  ): WebhookTargets<T> {
    if (options.targets) return options.targets

    throw new errors.E_UNAVAILABLE_TARGETS([this.#name])
  }

  async send(params: ChannelSendParams<WebhookMessage, WebhookTargets<T>>) {
    const { message } = params
    const targets = this.#resolveTargets(params)

    const normalizedTargets = this.#normalizeTargets(targets)
    for (const url of normalizedTargets) {
      await this.#sendMessageToWebhook(url, message)
    }

    // TODO
    return null as any
  }
}
