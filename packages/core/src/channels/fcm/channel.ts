import { getMessaging, Messaging } from 'firebase-admin/messaging'
import { initializeApp, cert } from 'firebase-admin/app'

import type { FcmConfig, FcmTargets } from './types.ts'
import type { FcmMessage } from './message.ts'

import {
  kTargetSymbol,
  type BatchConfig,
  type BatchSendResult,
  type Channel,
  type ChannelSendParams,
} from '../../types/index.ts'
import { errors } from '../../errors/index.ts'

export function fcmChannel(config: FcmConfig) {
  return new FcmChannel(config)
}

export class FcmChannel implements Channel<FcmConfig, FcmMessage, any, FcmTargets> {
  name = 'fcm' as const;
  [kTargetSymbol] = null as any as FcmTargets

  batchConfig: BatchConfig = { maxSize: 500, enabled: true }

  #messaging: Messaging
  #config: FcmConfig

  constructor(config: FcmConfig) {
    this.#config = config

    const app = initializeApp({
      ...config,
      ...(config.serviceAccountKeyPath ? { credential: cert(config.serviceAccountKeyPath) } : {}),
    })
    this.#messaging = getMessaging(app)
  }

  #resolveTargets(options: ChannelSendParams<FcmMessage, FcmTargets>): FcmTargets {
    if (options.targets) return options.targets

    throw new errors.E_UNAVAILABLE_TARGETS(['FCM'])
  }

  #handleError(error: any): never {
    if (error.code === 'messaging/registration-token-not-registered') {
      throw new Error(`FCM token is no longer valid: ${error.message}`)
    }

    if (error.code === 'messaging/invalid-argument') {
      throw new Error(`Invalid FCM message format: ${error.message}`)
    }

    throw error
  }

  #buildMessage(options: ChannelSendParams<FcmMessage, FcmTargets>) {
    const message = options.message.serialize()
    const targets = this.#resolveTargets(options)

    if (this.#config.debugToken) message.token = this.#config.debugToken

    if (targets.token) {
      message.token = this.#config.debugToken || targets.token
    } else if (targets.topic) {
      message.topic = targets.topic
    } else if (targets.condition) {
      message.condition = targets.condition
    }

    return message
  }

  async send(options: ChannelSendParams<FcmMessage, FcmTargets>) {
    const message = this.#buildMessage(options)
    return await this.#messaging.send(message).catch((error) => this.#handleError(error))
  }

  async sendBatch(messages: ChannelSendParams<FcmMessage, FcmTargets>[]): Promise<BatchSendResult> {
    const fcmMessages = messages.map((msg) => this.#buildMessage(msg))
    const response = await this.#messaging.sendEach(fcmMessages)

    return {
      success: response.successCount,
      failed: response.failureCount,
      results: response.responses.map((r, index) => {
        const result: BatchSendResult['results'][number] = {
          index,
          status: r.success ? 'success' : 'failed',
        }

        if (r.error) result.error = new Error(r.error.message, { cause: r.error })
        if (r.messageId) result.response = r.messageId

        return result
      }),
    }
  }
}

declare module '@facteurjs/core/types' {
  interface Notification {
    asFcmMessage(): FcmMessage
  }
}
