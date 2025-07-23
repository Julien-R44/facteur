import type { Knex } from 'knex'
import type { Kysely } from 'kysely'

export type NotificationStatus = 'read' | 'seen' | 'unread' | 'unseen'
export type Identifier = string | number

export interface AdapterGetNotificationsParams {
  notifiableId: Identifier
  tenantId: Identifier | undefined
  page?: number | undefined
  status?: NotificationStatus | undefined
  limit?: number
}

export interface GetNotificationsParams {
  notifiableId: Identifier
  tenantId?: Identifier
  page?: number
  limit?: number
  type?: NotificationStatus
}

export interface Notification {
  id: Identifier
  notifiableId: Identifier
  tenantId?: Identifier | undefined
  type: string
  content: Record<string, any>
  status: NotificationStatus
  tags?: string[]
  readAt?: Date
  seenAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

export interface SaveToDatabaseParams extends Omit<Notification, 'id'> {}

export interface UpdateNotificationParams {
  id: Identifier
  status: NotificationStatus
}

export interface UpdateAllNotificationsParams {
  notifiableId: Identifier
  tenantId?: Identifier | undefined
  status: NotificationStatus
}

export interface PruneNotificationsParams {
  notifiableId?: Identifier
  tenantId?: Identifier
  olderThan?: Date
}

/**
 * Options accepted by the database provider
 */
export interface DatabaseConfig {
  adapter: DatabaseAdapter

  /**
   * The table name to use for storing notifications
   * @default 'notifications'
   */
  tableName?: string
}

/**
 * Options accepted by the Kysely adapter
 */
export interface KyselyConfig {
  connection: Kysely<any>
}

/**
 * Options accepted by the Knex adapter
 */
export interface KnexConfig {
  connection: Knex
}

/**
 * The interface for implementing a new database adapter
 */
export interface DatabaseAdapter {
  save: (options: SaveToDatabaseParams) => Promise<void>
  setTableName: (tableName: string) => void
  getNotifications: (options: AdapterGetNotificationsParams) => Promise<Notification[]>
  updateNotification: (options: UpdateNotificationParams) => Promise<void>
  updateAllNotifications: (options: UpdateAllNotificationsParams) => Promise<void>
  pruneNotifications: (options: PruneNotificationsParams) => Promise<void>
}
