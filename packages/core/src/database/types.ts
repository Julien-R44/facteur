import type { Kysely } from 'kysely'
import type { Knex } from 'knex'

import type { ChannelName } from '../types/index.js'

export type NotificationStatus = 'read' | 'seen' | 'unread' | 'unseen'
export type Identifier = string | number

export interface AdapterGetNotificationsParams {
  notifiableId: Identifier
  tenantId: Identifier | undefined
  page?: number | undefined
  status?: NotificationStatus | undefined
  limit?: number
  tags?: string[] | undefined
}

export interface GetNotificationsParams {
  notifiableId: Identifier
  tenantId?: Identifier
  page?: number
  limit?: number
  status?: NotificationStatus
  tags?: string[]
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
}

export interface DatabaseAdapterCommonOptions {
  tableNames?: {
    /**
     * The table name to use for storing notifications
     * @default 'notifications'
     */
    notifications?: string | undefined

    /**
     * The table name to use for storing notification preferences
     * @default 'notification_preferences'
     */
    preferences?: string | undefined
  }
}

/**
 * Options accepted by the Kysely adapter
 */
export interface KyselyConfig extends DatabaseAdapterCommonOptions {
  connection: Kysely<any>
}

/**
 * Options accepted by the Knex adapter
 */
export interface KnexConfig extends DatabaseAdapterCommonOptions {
  connection: Knex | (() => Knex)
}

export interface GetPreferencesParams {
  notifiableId: Identifier
  tenantId?: Identifier
}

export interface RawPreferenceRow {
  id: Identifier
  user_id: Identifier
  tenant_id?: Identifier | null
  notification_name?: string | null
  channels: Record<string, boolean>
  created_at: Date
  updated_at?: Date | null
}

export interface NotificationsPreferences {
  /**
   * Global preferences
   */
  global: {
    channels: Record<ChannelName, boolean>
  }

  /**
   * Per-notification preferences
   */
  notifications: Array<{
    notification: { name?: string; identifier: string }
    channels: Record<ChannelName, boolean>
  }>
}

export interface Preferences {
  /**
   * Global preferences
   */
  global: NotificationsPreferences

  /**
   * Per-tenant per-notification preferences
   */
  tenants?: Record<Identifier, NotificationsPreferences>
}

export interface SavePreferencesParams {
  notifiableId: Identifier
  tenantId?: Identifier
  preferences: Preferences
}

export interface UpdatePreferencesParams {
  notifiableId: Identifier
  tenantId?: Identifier
  notificationName: string
  channelPreferences: Record<ChannelName, boolean>
}

/**
 * The interface for implementing a new database adapter
 */
export interface DatabaseAdapter {
  save: (options: SaveToDatabaseParams) => Promise<void>
  getNotifications: (options: AdapterGetNotificationsParams) => Promise<Notification[]>
  updateNotification: (options: UpdateNotificationParams) => Promise<void>
  updateAllNotifications: (options: UpdateAllNotificationsParams) => Promise<void>
  pruneNotifications: (options: PruneNotificationsParams) => Promise<void>
  getPreferences: (options: GetPreferencesParams) => Promise<RawPreferenceRow[]>
  updatePreferences: (options: UpdatePreferencesParams) => Promise<void>
}
