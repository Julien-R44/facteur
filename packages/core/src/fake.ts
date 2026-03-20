import { AssertionError } from 'node:assert'

import type { Notification, InternalSendOptions, NotificationSendResult } from './types/index.ts'

export interface SentNotification<N extends Notification = Notification> {
  notification: N
  to: N extends Notification<infer TNotifiable, any> ? TNotifiable : never
  params?: N extends Notification<any, infer P> ? P : never
  via?: any
}

export class FacteurFake {
  #sentNotifications: SentNotification[] = []
  #restoreFn: () => void

  constructor(restoreFn: () => void) {
    this.#restoreFn = restoreFn
  }

  [Symbol.dispose]() {
    this.#restoreFn()
  }

  /**
   * Record a notification as sent during fake mode
   */
  recordSent(options: InternalSendOptions): NotificationSendResult {
    const notification = new options.notification({
      to: options.to,
      params: options.params,
      tenantId: options.tenantId,
    })

    this.#sentNotifications.push({
      notification,
      to: options.to,
      params: options.params,
      via: options.via,
    } as SentNotification)

    return { success: 1, failed: 0, results: [{ channel: 'fake' as never, status: 'success' }] }
  }

  /**
   * Assert a total of expected number of notifications were sent
   */
  assertSentCount(count: number): void
  /**
   * Assert the mentioned notification was sent for expected number of times
   */
  assertSentCount<N extends Notification>(
    notificationClass: new (...args: any[]) => N,
    count: number,
  ): void
  assertSentCount<N extends Notification>(
    notificationClassOrCount: (new (...args: any[]) => N) | number,
    count?: number,
  ): void {
    if (typeof notificationClassOrCount === 'number') {
      const totalCount = notificationClassOrCount
      if (this.#sentNotifications.length !== totalCount) {
        throw new AssertionError({
          message: `Expected ${totalCount} notifications to be sent, but ${this.#sentNotifications.length} were sent`,
          actual: this.#sentNotifications.length,
          expected: totalCount,
        })
      }
      return
    }

    const notificationClass = notificationClassOrCount
    const actualCount = this.#sentNotifications.filter(
      (sent) => sent.notification instanceof notificationClass,
    ).length

    if (actualCount !== count!) {
      throw new AssertionError({
        message: `Expected ${count} notifications of type ${notificationClass.name} to be sent, but ${actualCount} were sent`,
        actual: actualCount,
        expected: count,
      })
    }
  }

  /**
   * Assert zero notifications were sent
   */
  assertNoneSent(): void {
    if (this.#sentNotifications.length > 0) {
      throw new AssertionError({
        message: `Expected no notifications to be sent, but ${this.#sentNotifications.length} were sent`,
        actual: this.#sentNotifications.length,
        expected: 0,
      })
    }
  }

  /**
   * Returns a list of sent notifications captured by the fake
   */
  sent(): SentNotification[]
  /**
   * Returns a list of sent notifications of a specific type captured by the fake
   */
  sent<N extends Notification>(notificationClass: new (...args: any[]) => N): SentNotification<N>[]
  sent<N extends Notification>(
    notificationClass?: new (...args: any[]) => N,
  ): SentNotification[] | SentNotification<N>[] {
    if (!notificationClass) {
      return this.#sentNotifications
    }

    return this.#sentNotifications.filter(
      (sent) => sent.notification instanceof notificationClass,
    ) as SentNotification<N>[]
  }

  /**
   * Assert the mentioned notification was sent during the fake mode
   */
  assertSent<N extends Notification>(
    notificationClass: new (...args: any[]) => N,
    callback?: (sentNotification: SentNotification<N>) => void,
  ): void {
    const sentNotifications = this.sent(notificationClass)

    if (sentNotifications.length === 0) {
      throw new AssertionError({
        message: `Expected notification "${notificationClass.name}" was not sent`,
      })
    }

    if (callback) {
      const found = sentNotifications.some((sent) => {
        try {
          callback(sent)
          return true
        } catch {
          return false
        }
      })

      if (!found) {
        throw new AssertionError({
          message: `No notifications of type ${notificationClass.name} matched the given callback`,
        })
      }
    }
  }

  /**
   * Clear all sent notifications from the fake
   */
  clear(): void {
    this.#sentNotifications = []
  }
}
