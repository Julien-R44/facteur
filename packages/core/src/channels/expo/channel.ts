import { Expo } from 'expo-server-sdk'

import type { ExpoConfig, ExpoTargets } from './types.js'
import type { ExpoMessage } from './message.js'

import { kTargetSymbol, type Channel, type ChannelSendParams } from '../../types/index.js'
import { errors } from '../../errors/index.js'

export function expoChannel(config: ExpoConfig = {}) {
  return new ExpoChannel(config)
}

export class ExpoChannel implements Channel<ExpoConfig, ExpoMessage, any, ExpoTargets> {
  name = 'expo' as const;
  [kTargetSymbol] = null as any as ExpoTargets

  #expo: Expo

  constructor(config: ExpoConfig) {
    this.#expo = new Expo(config)

    if (config.accessToken) {
      this.#validateExpoToken(config.accessToken)
    }
  }

  #validateExpoToken(token: string): void {
    if (!Expo.isExpoPushToken(token)) {
      throw new Error(`Invalid Expo push token: ${token}`)
    }
  }

  #resolveTargets(options: ChannelSendParams<ExpoMessage, ExpoTargets>): ExpoTargets {
    if (options.targets) return options.targets

    throw new errors.E_UNAVAILABLE_TARGETS(['Expo'])
  }

  async send(options: ChannelSendParams<ExpoMessage, ExpoTargets>) {
    const targets = this.#resolveTargets(options)
    const message = options.message.serialize({ to: targets.expoToken })

    const [ticket] = await this.#expo.sendPushNotificationsAsync([message])

    if (ticket?.status === 'error')
      throw new Error(`Expo push notification failed: ${ticket.message}`)

    return { id: ticket?.id, status: ticket?.status }
  }
}

declare module '@facteurjs/core/types' {
  interface Notification {
    asExpoMessage(): ExpoMessage
  }
}
