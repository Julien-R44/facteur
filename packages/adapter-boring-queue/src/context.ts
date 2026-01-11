import type { Facteur } from '@facteurjs/core'
import type { Notification, NotificationJobPayload } from '@facteurjs/core/types'

import type { FacteurWorkerConfig } from './types.ts'

type NotificationConstructor = new (...args: any[]) => Notification<any, any>

/**
 * Internal context for the Facteur queue worker.
 * Stores the Facteur instance and notification map for job processing.
 */
class FacteurQueueContext {
  #facteur: Facteur<any, any> | null = null
  #notificationMap: Map<string, NotificationConstructor> = new Map()
  #config: Omit<FacteurWorkerConfig, 'facteur'> | null = null

  async init(config: FacteurWorkerConfig): Promise<void> {
    this.#facteur = config.facteur
    this.#config = config

    const notifications = await config.facteur.discoverer.discoverNotifications()
    for (const NotifClass of notifications) {
      const options = (NotifClass as any).options || {}
      const identifier = options.identifier || NotifClass.name
      this.#notificationMap.set(identifier, NotifClass as NotificationConstructor)
    }
  }

  get facteur(): Facteur<any, any> {
    if (!this.#facteur) throw new Error('FacteurQueueContext not initialized. Call init() first.')
    return this.#facteur
  }

  get config(): Omit<FacteurWorkerConfig, 'facteur'> | null {
    return this.#config
  }

  getNotificationClass(identifier: string): NotificationConstructor | undefined {
    return this.#notificationMap.get(identifier)
  }

  async processJob(payload: NotificationJobPayload): Promise<void> {
    const NotifClass = this.getNotificationClass(payload.notificationIdentifier)
    if (!NotifClass) throw new Error(`Unknown notification: ${payload.notificationIdentifier}`)

    if (this.#config?.beforeSend) {
      const shouldProceed = await this.#config.beforeSend(payload)
      if (!shouldProceed) return
    }

    try {
      const recipient = this.#buildRecipient(payload)

      const notification = new NotifClass({
        to: recipient,
        params: payload.params,
        tenantId: payload.tenantId,
      })

      const message = this.#buildMessage(notification, payload.channelName)
      if (!message) return

      await this.facteur.sendViaChannel({
        channelName: payload.channelName,
        message,
        target: payload.target,
        recipient,
        tenantId: payload.tenantId,
      })

      if (this.#config?.afterSend) await this.#config.afterSend(payload)
    } catch (error) {
      if (this.#config?.onError) await this.#config.onError(payload, error as Error)
      throw error
    }
  }

  #buildRecipient(payload: NotificationJobPayload): Record<string, any> {
    return {
      ...payload.recipientData,
      notificationTargets: () => ({ [payload.channelName]: payload.target }),
    }
  }

  #buildMessage(notification: Notification<any, any>, channelName: string): unknown {
    const capitalizedChannelName = channelName.charAt(0).toUpperCase() + channelName.slice(1)
    const methodName = `as${capitalizedChannelName}Message`
    const messageBuilder = (notification as any)[methodName]

    if (typeof messageBuilder !== 'function') {
      throw new Error(`Notification missing ${methodName} method`)
    }

    return messageBuilder.call(notification)
  }
}

export const facteurQueueContext = new FacteurQueueContext()
