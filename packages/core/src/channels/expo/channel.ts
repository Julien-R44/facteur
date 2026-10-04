import type { Awaitable } from '@julr/utils/types'

import { Expo } from 'expo-server-sdk'

import type { ExpoConfig, ExpoTargets } from './types.ts'
import type { ExpoMessage } from './message.ts'

import {
  kTargetSymbol,
  type BatchConfig,
  type BatchSendResult,
  type Channel,
  type ChannelSendParams,
} from '../../types/index.ts'
import { errors } from '../../errors/index.ts'

export function expoChannel(config: ExpoConfig = {}) {
  return new ExpoChannel(config)
}

export class ExpoChannel implements Channel<ExpoConfig, ExpoMessage, any, ExpoTargets> {
  name = 'expo' as const;
  [kTargetSymbol] = null as any as ExpoTargets

  batchConfig: BatchConfig = { maxSize: 100, enabled: true }

  #expo: Expo

  constructor(config: ExpoConfig) {
    this.#expo = new Expo(config)
  }

  #resolveTargets(options: ChannelSendParams<ExpoMessage, ExpoTargets>): ExpoTargets {
    if (options.targets) return options.targets

    throw new errors.E_UNAVAILABLE_TARGETS(['Expo'])
  }

  #buildMessage(options: ChannelSendParams<ExpoMessage, ExpoTargets>) {
    const targets = this.#resolveTargets(options)
    return options.message.serialize({ to: targets.expoToken })
  }

  async send(options: ChannelSendParams<ExpoMessage, ExpoTargets>) {
    const message = this.#buildMessage(options)
    const [ticket] = await this.#expo.sendPushNotificationsAsync([message])

    if (ticket?.status === 'error') {
      throw new Error(`Expo push notification failed: ${ticket.message}`)
    }

    return { id: ticket?.id, status: ticket?.status }
  }

  async sendBatch(
    messages: ChannelSendParams<ExpoMessage, ExpoTargets>[],
  ): Promise<BatchSendResult> {
    const expoMessages = messages.map((msg) => this.#buildMessage(msg))
    const tickets = await this.#expo.sendPushNotificationsAsync(expoMessages)

    let successCount = 0
    let failedCount = 0

    const results = tickets.map((ticket, index) => {
      const result: BatchSendResult['results'][number] = {
        index,
        status: ticket.status === 'ok' ? 'success' : 'failed',
      }

      if (ticket.status === 'ok') {
        successCount++
        result.response = ticket.id
      } else {
        failedCount++
        result.error = new Error(ticket.message || 'Unknown Expo error', { cause: ticket.details })
      }

      return result
    })

    return { success: successCount, failed: failedCount, results }
  }
}

declare module '@facteurjs/core/types' {
  interface Notification {
    asExpoMessage(): Awaitable<ExpoMessage>
  }
}
