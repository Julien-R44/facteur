import type { Awaitable } from '@julr/utils/types'

import webpush from 'web-push'

import type { WebpushConfig, WebpushTargets } from './types.ts'
import type { WebpushMessage } from './message.ts'

import { kTargetSymbol, type Channel, type ChannelSendParams } from '../../types/index.ts'
import { errors } from '../../errors/index.ts'

export function webpushChannel(config: WebpushConfig) {
  return new WebpushChannel(config)
}

export class WebpushChannel implements Channel<WebpushConfig, WebpushMessage, any, WebpushTargets> {
  name = 'webpush' as const;
  [kTargetSymbol] = null as any as WebpushTargets

  constructor(private config: WebpushConfig) {
    webpush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, config.vapidPrivateKey)

    if (config.gcmApiKey) webpush.setGCMAPIKey(config.gcmApiKey)
  }

  #resolveTargets(options: ChannelSendParams<WebpushMessage, WebpushTargets>): WebpushTargets {
    if (options.targets) return options.targets

    throw new errors.E_UNAVAILABLE_TARGETS(['Webpush'])
  }

  #buildOptions(): webpush.RequestOptions {
    const options: webpush.RequestOptions = {}

    if (this.config.ttl !== undefined) options.TTL = this.config.ttl
    if (this.config.urgency) options.urgency = this.config.urgency
    if (this.config.proxy) options.proxy = this.config.proxy
    if (this.config.timeout) options.timeout = this.config.timeout

    return options
  }

  #handleError(error: any): never {
    if (error.statusCode === 410) {
      throw new Error(`Webpush subscription is no longer valid: ${error.body}`)
    }

    if (error.statusCode === 413) {
      throw new Error(`Webpush payload too large: ${error.body}`)
    }

    if (error.statusCode === 400) {
      throw new Error(`Invalid webpush request: ${error.body}`)
    }

    if (error.statusCode === 429) {
      throw new Error(`Webpush rate limit exceeded: ${error.body}`)
    }

    throw error
  }

  async send(options: ChannelSendParams<WebpushMessage, WebpushTargets>) {
    const payload = options.message.serialize()
    const targets = this.#resolveTargets(options)
    const webpushOptions = this.#buildOptions()

    try {
      const result = await webpush.sendNotification(targets.subscription, payload, webpushOptions)
      return { statusCode: result.statusCode, headers: result.headers, body: result.body }
    } catch (error) {
      return this.#handleError(error)
    }
  }
}

declare module '@facteurjs/core/types' {
  interface Notification {
    asWebpushMessage(): Awaitable<WebpushMessage>
  }
}
