import { invoke } from '@julr/utils/functions'
import { kTargetSymbol, type Channel, type ChannelSendParams } from '@facteurjs/core/types'

import type { FcmMessage } from './message.js'
import type { FcmConfig, FcmTargets } from './types.js'
import { initializeApp, cert } from 'firebase-admin/app'
import { getMessaging, Messaging } from 'firebase-admin/messaging'

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
    return invoke<FcmTargets>(() => {
      if (options.notifiable?.notificationTargetForFcm) {
        return options.notifiable.notificationTargetForFcm()
      }

      if (options.notifiable?.fcmToken) return { token: options.notifiable.fcmToken }

      if (options.targets) return options.targets

      throw new Error(
        'Unable to determine FCM targets. Provide targets or implement notificationTargetForFcm() method.',
      )
    })
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
  interface Notification<
    N extends Notifiable = Notifiable,
    Params extends Record<string, any> = any,
  > {
    toFcmMessage(ctx: MessageCtx<N, Params>): FcmMessage
  }
}
