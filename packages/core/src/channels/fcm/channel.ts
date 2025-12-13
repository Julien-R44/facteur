import { getMessaging, Messaging } from 'firebase-admin/messaging'
import { initializeApp, cert } from 'firebase-admin/app'

import type { FcmConfig, FcmTargets } from './types.js'
import type { FcmMessage } from './message.js'

import { kTargetSymbol, type Channel, type ChannelSendParams } from '../../types/index.js'
import { errors } from '../../errors/index.js'

export function fcmChannel(config: FcmConfig) {
  return new FcmChannel(config)
}

export class FcmChannel implements Channel<FcmConfig, FcmMessage, any, FcmTargets> {
  name = 'fcm' as const;
  [kTargetSymbol] = null as any as FcmTargets
  private messaging: Messaging

  constructor(private config: FcmConfig) {
    const app = initializeApp({
      ...config,
      ...(config.serviceAccountKeyPath ? { credential: cert(config.serviceAccountKeyPath) } : {}),
    })
    this.messaging = getMessaging(app)
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

  async send(options: ChannelSendParams<FcmMessage, FcmTargets>) {
    const message = options.message.serialize()
    const targets = this.#resolveTargets(options)

    if (this.config.debugToken) message.token = this.config.debugToken

    if (targets.token) {
      message.token = this.config.debugToken || targets.token
    } else if (targets.topic) {
      message.topic = targets.topic
    } else if (targets.condition) {
      message.condition = targets.condition
    }

    return await this.messaging.send(message).catch((error) => this.#handleError(error))
  }
}

declare module '@facteurjs/core/types' {
  interface Notification {
    asFcmMessage(): FcmMessage
  }
}
