import type { Awaitable } from '@julr/utils/types'

import webpush from 'web-push'

import type { WebpushConfig, WebpushTargets, WebpushSubscription } from './types.ts'
import type { WebpushMessage } from './message.ts'

import { kTargetSymbol, type Channel, type ChannelSendParams } from '../../types/index.ts'
import { errors } from '../../errors/index.ts'

type Targets = WebpushTargets<WebpushSubscription | WebpushSubscription[]>

export function webpushChannel(config: WebpushConfig) {
  return new WebpushChannel(config)
}

export class WebpushChannel implements Channel<WebpushConfig, WebpushMessage, any, Targets> {
  name = 'webpush' as const;
  [kTargetSymbol] = null as any as Targets

  constructor(private config: WebpushConfig) {
    webpush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, config.vapidPrivateKey)

    if (config.gcmApiKey) webpush.setGCMAPIKey(config.gcmApiKey)
  }

  #resolveTargets(options: ChannelSendParams<WebpushMessage, Targets>): Targets {
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
      throw new Error(`Webpush subscription is no longer valid: ${error.body}`, { cause: error })
    }

    if (error.statusCode === 413) {
      throw new Error(`Webpush payload too large: ${error.body}`, { cause: error })
    }

    if (error.statusCode === 400) {
      throw new Error(`Invalid webpush request: ${error.body}`, { cause: error })
    }

    if (error.statusCode === 429) {
      throw new Error(`Webpush rate limit exceeded: ${error.body}`, { cause: error })
    }

    throw error
  }

  send(options: ChannelSendParams<WebpushMessage, WebpushTargets>): Promise<webpush.SendResult>
  send(
    options: ChannelSendParams<WebpushMessage, WebpushTargets<WebpushSubscription[]>>,
  ): Promise<webpush.SendResult[]>
  send(
    options: ChannelSendParams<WebpushMessage, Targets>,
  ): Promise<webpush.SendResult | webpush.SendResult[]>
  async send(options: ChannelSendParams<WebpushMessage, Targets>) {
    const payload = options.message.serialize()
    const targets = this.#resolveTargets(options)
    const webpushOptions = this.#buildOptions()

    const send = async (subscription: WebpushSubscription) => {
      try {
        const result = await webpush.sendNotification(subscription, payload, webpushOptions)
        return { statusCode: result.statusCode, headers: result.headers, body: result.body }
      } catch (error) {
        return this.#handleError(error)
      }
    }

    if (!Array.isArray(targets.subscription)) return send(targets.subscription)

    const results = await Promise.allSettled(targets.subscription.map(send))
    const failures = results.filter((result) => result.status === 'rejected')

    if (failures.length) {
      throw new AggregateError(
        failures.map((result) => result.reason),
        `Failed to send Webpush notification to ${failures.length} subscription(s)`,
      )
    }

    return results.filter((result) => result.status === 'fulfilled').map((result) => result.value)
  }
}

declare module '@facteurjs/core/types' {
  interface Notification {
    asWebpushMessage(): Awaitable<WebpushMessage>
  }
}
