import type { KyInstance } from 'ky'

import type {
  NotificationFilter,
  NotificationsList,
  MarkAsOptions,
  MarkAllAsOptions,
} from './types.js'

export class NotificationsApi<DatabaseContent> {
  #client: KyInstance
  #notifiableId: string

  constructor(client: KyInstance, notifiableId: string) {
    this.#client = client
    this.#notifiableId = notifiableId
  }

  /**
   * Get all notifications for the user
   */
  async list(options: NotificationFilter = {}): Promise<NotificationsList<DatabaseContent>> {
    const searchParams = new URLSearchParams()

    if (options.page) searchParams.set('page', options.page.toString())
    if (options.limit) searchParams.set('limit', options.limit.toString())
    if (options.status) searchParams.set('status', options.status)
    if (options.tenantId) searchParams.set('tenantId', options.tenantId)
    if (options.tags) searchParams.set('tags', JSON.stringify(options.tags))

    return this.#client
      .get(`notifications/notifiable/${this.#notifiableId}/notifications`, { searchParams })
      .json<NotificationsList<DatabaseContent>>()
  }

  /**
   * Mark a specific notification as read or seen
   */
  async markAs(options: MarkAsOptions): Promise<void> {
    await this.#client
      .post(`notifications/notifiable/${this.#notifiableId}/mark-as`, { json: options })
      .json()
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(options: { notificationId: string }): Promise<void> {
    return this.markAs({ notificationId: options.notificationId, status: 'read' })
  }

  /**
   * Mark a notification as seen
   */
  async markAsSeen(options: { notificationId: string }): Promise<void> {
    return this.markAs({ notificationId: options.notificationId, status: 'seen' })
  }

  /**
   * Mark all notifications as read or seen
   */
  async markAllAs(options: MarkAllAsOptions): Promise<void> {
    await this.#client
      .post(`notifications/notifiable/${this.#notifiableId}/mark-all`, { json: options })
      .json()
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(options: { tenantId?: string } = {}): Promise<void> {
    return this.markAllAs({ status: 'read', ...options })
  }

  /**
   * Mark all notifications as seen
   */
  async markAllAsSeen(options: { tenantId?: string } = {}): Promise<void> {
    return this.markAllAs({ status: 'seen', ...options })
  }
}
