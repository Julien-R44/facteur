import ky, { HTTPError, type Options as KyOptions } from 'ky'

import type { WebhookOptions, WebhookTargetOptions, WebhookTargets } from './types.ts'
import type { WebhookMessage } from './message.ts'

import {
  E_WEBHOOK_INSECURE_URL,
  decodeSigningSecret,
  generateWebhookId,
  signWebhookPayload,
} from './security.ts'
import { WebhookRequestException } from './exceptions.ts'
import { kTargetSymbol, type Channel, type ChannelSendParams } from '../../types/index.ts'
import { errors } from '../../errors/index.ts'
import { HTTPErrorExtractor } from '../../errors/http_error.ts'

export function webhookChannel<Options extends WebhookOptions<any>>(
  options: Options & { name: string },
) {
  return new WebhookChannel(options)
}

export class WebhookChannel<T extends WebhookOptions<any>> implements Channel<
  T,
  WebhookMessage,
  any,
  WebhookTargets<T>
> {
  name = 'webhook' as const;
  [kTargetSymbol] = null as any as WebhookTargets<T>
  #webhooksUrls: Map<string, URL> = new Map()
  #name: string
  #signingKey?: Buffer
  #httpsOnly: boolean
  #requestOptions: Pick<KyOptions, 'timeout' | 'fetch' | 'redirect'> = {}

  /**
   * `webhook-id` generated per message instance, so retries of the same
   * message reuse the same id and receivers can deduplicate them
   */
  #messageIds = new WeakMap<WebhookMessage, string>()

  constructor(options: T & { name: string }) {
    this.#name = options.name
    this.#httpsOnly = options.httpsOnly === true
    if (options.signingSecret !== undefined) {
      this.#signingKey = decodeSigningSecret(options.signingSecret)
    }

    if (options.timeout !== undefined) this.#requestOptions.timeout = options.timeout
    if (options.fetch) this.#requestOptions.fetch = options.fetch
    if (options.followRedirects === false) this.#requestOptions.redirect = 'manual'

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

  #getMessageId(message: WebhookMessage, explicitId?: string) {
    if (explicitId) return explicitId

    let id = this.#messageIds.get(message)
    if (!id) {
      id = generateWebhookId()
      this.#messageIds.set(message, id)
    }

    return id
  }

  async #sendMessageToWebhook(url: URL, message: WebhookMessage, signingKey?: Buffer) {
    const serialized = message.serialize()

    /**
     * Serialize the body once so the signature covers the exact bytes sent
     */
    const payload = serialized.body === undefined ? undefined : JSON.stringify(serialized.body)
    const headers = new Headers(serialized.headers)
    if (payload !== undefined && !headers.has('content-type')) {
      headers.set('content-type', 'application/json')
    }

    if (signingKey) {
      const signatureHeaders = signWebhookPayload({
        key: signingKey,
        id: this.#getMessageId(message, serialized.id),
        timestamp: Math.floor(Date.now() / 1000),
        payload: payload ?? '',
      })
      for (const [name, value] of Object.entries(signatureHeaders)) headers.set(name, value)
    }

    return await ky
      .post(url, {
        ...this.#requestOptions,
        searchParams: serialized.queryParameters,
        headers,
        ...(payload !== undefined && { body: payload }),
      })
      .catch(async (error) => {
        if (error instanceof HTTPError) {
          throw new WebhookRequestException(await HTTPErrorExtractor.extract(error))
        }
        throw error
      })
  }

  #normalizeTargets(targets: WebhookTargets<T>) {
    if ('webhookUrl' in targets && targets.webhookUrl) {
      return [this.#buildWebhookEntry('default', targets.webhookUrl)[1]]
    }

    return Object.entries(targets)
      .filter(([, enabled]) => enabled === true)
      .map(([key]) => {
        const url = this.#webhooksUrls.get(key)
        if (!url) throw new errors.E_UNAVAILABLE_TARGETS([this.#name])
        return url
      })
  }

  #resolveSigningKey(targets: WebhookTargets<T>) {
    const { signingSecret } = targets as WebhookTargetOptions
    if (signingSecret !== undefined) return decodeSigningSecret(signingSecret)

    return this.#signingKey
  }

  /**
   * Check every URL before sending anything, so a multi-target send
   * never partially reaches insecure endpoints
   */
  #assertHttpsTargets(urls: URL[]) {
    for (const url of urls) {
      if (url.protocol !== 'https:') throw new E_WEBHOOK_INSECURE_URL([url.protocol])
    }
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
    const signingKey = this.#resolveSigningKey(targets)
    if (this.#httpsOnly) this.#assertHttpsTargets(normalizedTargets)

    for (const url of normalizedTargets) {
      await this.#sendMessageToWebhook(url, message, signingKey)
    }

    // TODO
    return null as any
  }
}
