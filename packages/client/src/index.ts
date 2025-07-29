import ky, { type KyInstance, type Options } from 'ky'

export interface FacteurClientConfig extends Omit<Options, 'prefixUrl'> {
  /**
   * The base URL of the Facteur API
   */
  apiUrl: string
}

type NotificationStatus = 'read' | 'seen' | 'unread' | 'unseen'
export interface NotificationFilter {
  page?: number
  limit?: number
  status?: NotificationStatus
  tenantId?: string
}

type Identifier = string | number
export interface Notification<DatabaseContent = Record<string, any>> {
  id: Identifier
  notifiableId: Identifier
  tenantId?: Identifier | undefined
  type: string
  content: DatabaseContent
  status: NotificationStatus
  tags?: string[]
  readAt?: string
  seenAt?: string
  createdAt: string
  updatedAt?: string
}

export type NotificationsList<DatabaseContent> = Notification<DatabaseContent>[]

export interface MarkAsOptions {
  notificationId: string
  status: 'read' | 'seen'
}

export interface MarkAllAsOptions {
  status: 'read' | 'seen'
  tenantId?: string
}

export interface PreferencesData {
  [notificationName: string]: {
    [channelName: string]: boolean
  }
}

export interface UpdatePreferencesOptions {
  preferences: PreferencesData
  tenantId?: string
  notificationName?: string
}

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
