import type { ChannelName, Notification } from '../types/index.ts'

interface MessageEventOptions {
  notification: Notification<any, any>
  channelName: ChannelName
  message: any
}

interface NotificationEventOptions {
  notification: Notification<any, any>
}

export class FacteurEvents {
  #buildMessageEventData(options: MessageEventOptions) {
    return {
      notification: options.notification,
      channelName: options.channelName,
      message: options.message,
    }
  }

  #buildNotificationEventData(options: NotificationEventOptions) {
    return {
      notification: options.notification,
    }
  }

  /**
   * Sent when a message is about to be sent.
   */
  messageSending(options: MessageEventOptions) {
    return {
      name: 'facteur:message:sending' as const,
      data: this.#buildMessageEventData(options),
    }
  }

  /**
   * Sent when a message has been successfully sent.
   */
  messageSent(options: MessageEventOptions) {
    return {
      name: 'facteur:message:sent' as const,
      data: this.#buildMessageEventData(options),
    }
  }

  /**
   * Sent when a message failed to send.
   */
  messageFailed(options: MessageEventOptions & { error: Error }) {
    return {
      name: 'facteur:message:failed' as const,
      data: {
        ...this.#buildMessageEventData(options),
        error: options.error,
      },
    }
  }

  /**
   * Sent when a notification is about to be sent.
   */
  notificationSending(
    options: NotificationEventOptions & { resolvedChannels: Record<string, any> },
  ) {
    return {
      name: 'facteur:notification:sending' as const,
      data: {
        ...this.#buildNotificationEventData(options),
        resolvedChannels: options.resolvedChannels,
      },
    }
  }

  /**
   * Sent when a notification has been successfully sent.
   */
  notificationSent(options: NotificationEventOptions & { results: any[] }) {
    return {
      name: 'facteur:notification:sent' as const,
      data: {
        ...this.#buildNotificationEventData(options),
        results: options.results,
      },
    }
  }

  /**
   * Sent when a notification failed to send.
   */
  notificationFailed(options: NotificationEventOptions & { errors: Error[] }) {
    return {
      name: 'facteur:notification:failed' as const,
      data: {
        ...this.#buildNotificationEventData(options),
        errors: options.errors,
      },
    }
  }
}

export const facteurEvents = new FacteurEvents()
