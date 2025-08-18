import { type Options } from 'ky'

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
  tags?: string[]
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
