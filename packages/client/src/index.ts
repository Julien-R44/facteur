import type { KyInstance } from 'ky'
import ky from 'ky'
import type {
  NotificationFilter,
  NotificationsList,
  MarkAsOptions,
  MarkAllAsOptions,
  PreferencesData,
  UpdatePreferencesOptions,
  FacteurClientConfig,
} from './types.js'

class NotificationsApi<DatabaseContent> {
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
      .post(`notifications/notifiable/${this.#notifiableId}/mark-as`, {
        json: options,
      })
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
    return this.markAs({
      notificationId: options.notificationId,
      status: 'seen',
    })
  }

  /**
   * Mark all notifications as read or seen
   */
  async markAllAs(options: MarkAllAsOptions): Promise<void> {
    await this.#client
      .post(`notifications/notifiable/${this.#notifiableId}/mark-all`, {
        json: options,
      })
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

class PreferencesApi {
  #client: KyInstance
  #notifiableId: string

  constructor(client: KyInstance, notifiableId: string) {
    this.#client = client
    this.#notifiableId = notifiableId
  }

  /**
   * Get notification preferences for the user
   */
  async list(options: { tenantId?: string } = {}): Promise<PreferencesData> {
    const searchParams = new URLSearchParams()
    if (options.tenantId) searchParams.set('tenantId', options.tenantId)

    return this.#client
      .get(`notifications/notifiable/${this.#notifiableId}/preferences`, { searchParams })
      .json<PreferencesData>()
  }

  /**
   * Update notification preferences for the user
   */
  async update(options: UpdatePreferencesOptions): Promise<void> {
    await this.#client
      .post(`notifications/notifiable/${this.#notifiableId}/preferences`, {
        json: options,
      })
      .json()
  }
}

export class FacteurClient<DatabaseContent> {
  #client: KyInstance
  #notifiableId: string

  readonly notifications: NotificationsApi<DatabaseContent>
  readonly preferences: PreferencesApi

  constructor(options: FacteurClientConfig & { notifiableId: string }) {
    const { apiUrl, notifiableId } = options

    this.#notifiableId = notifiableId
    this.#client = ky.create({ prefixUrl: apiUrl, ...options })

    this.notifications = new NotificationsApi(this.#client, this.#notifiableId)
    this.preferences = new PreferencesApi(this.#client, this.#notifiableId)
  }

  /**
   * Get the current notifiable ID
   */
  get notifiableId(): string {
    return this.#notifiableId
  }
}

export function createFacteurClient<
  DatabaseContent extends Record<string, any> = Record<string, any>,
>(options: FacteurClientConfig & { notifiableId: string }): FacteurClient<DatabaseContent> {
  return new FacteurClient<DatabaseContent>(options)
}
