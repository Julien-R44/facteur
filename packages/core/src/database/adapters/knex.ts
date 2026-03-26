import type { Knex } from 'knex'

import type {
  DatabaseAdapter,
  AdapterGetNotificationsParams,
  KnexConfig,
  Notification,
  PruneNotificationsParams,
  SaveToDatabaseParams,
  UpdateAllNotificationsParams,
  UpdateNotificationParams,
  GetPreferencesParams,
  RawPreferenceRow,
  UpdatePreferencesParams,
} from '../types.ts'

export function knexAdapter(config: KnexConfig): DatabaseAdapter {
  return new KnexAdapter(config)
}

class KnexAdapter implements DatabaseAdapter {
  #tableName: string = 'notifications'
  #preferencesTableName: string = 'notification_preferences'
  #connectionResolver: () => Knex

  constructor(config: KnexConfig) {
    this.#connectionResolver = this.#isKnexInstance(config.connection)
      ? () => config.connection as Knex
      : (config.connection as () => Knex)
    this.#tableName = config.tableNames?.notifications || 'notifications'
    this.#preferencesTableName = config.tableNames?.preferences || 'notification_preferences'
  }

  #isKnexInstance(connection: Knex | (() => Knex)): connection is Knex {
    return 'client' in connection
  }

  #getConnection(): Knex {
    return this.#connectionResolver()
  }

  setTableName(tableName: string) {
    this.#tableName = tableName
  }

  async save(options: SaveToDatabaseParams) {
    await this.#getConnection().table(this.#tableName).insert({
      notifiable_id: options.notifiableId,
      tenant_id: options.tenantId || null,
      type: options.type,
      content: JSON.stringify(options.content),
      status: options.status,
      created_at: options.createdAt || new Date(),
      updated_at: options.updatedAt || new Date(),
      tags: options.tags ? JSON.stringify(options.tags) : null,
    })
  }

  async getNotifications(options: AdapterGetNotificationsParams): Promise<Notification[]> {
    const page = options.page || 1
    const limit = Math.min(options.limit || 10, 100)
    const offset = (page - 1) * limit

    let query = this.#getConnection().table(this.#tableName).where('notifiable_id', options.notifiableId)

    if (options.tenantId) query.where('tenant_id', options.tenantId)
    if (options.status) query.where('status', options.status)
    if (options.tags) query.whereJsonSupersetOf('tags' as never, JSON.stringify(options.tags))

    const results = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .select('*')

    return results.map((row: any) => ({
      id: row.id,
      notifiableId: row.notifiable_id,
      tenantId: row.tenant_id,
      type: row.type,
      content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
      status: row.status,
      tags: row.tags ? (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags) : undefined,
      readAt: row.read_at,
      seenAt: row.seen_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  }

  async updateNotification(options: UpdateNotificationParams): Promise<void> {
    const updateData: any = {
      status: options.status,
      updated_at: new Date(),
    }

    if (options.status === 'read') {
      updateData.read_at = new Date()
    } else if (options.status === 'seen') {
      updateData.seen_at = new Date()
    }

    await this.#getConnection()
      .table(this.#tableName)
      .where('id', options.id)
      .update(updateData)
  }

  async updateAllNotifications(options: UpdateAllNotificationsParams): Promise<void> {
    const updateData: any = {
      status: options.status,
      updated_at: new Date(),
    }

    if (options.status === 'read') {
      updateData.read_at = new Date()
    } else if (options.status === 'seen') {
      updateData.seen_at = new Date()
    }

    let query = this.#getConnection().table(this.#tableName).where('notifiable_id', options.notifiableId)
    if (options.tenantId) query = query.where('tenant_id', options.tenantId)

    await query.update(updateData)
  }

  async pruneNotifications(options: PruneNotificationsParams): Promise<void> {
    let query = this.#getConnection().table(this.#tableName)

    if (options.notifiableId) query = query.where('notifiable_id', options.notifiableId)
    if (options.tenantId) query = query.where('tenant_id', options.tenantId)
    if (options.olderThan) query = query.where('created_at', '<', options.olderThan)

    await query.del()
  }

  async getPreferences(options: GetPreferencesParams): Promise<RawPreferenceRow[]> {
    const results = await this.#getConnection()
      .table(this.#preferencesTableName)
      .where('user_id', options.notifiableId)
      .andWhere((builder) => {
        builder.whereNull('tenant_id')
        if (options.tenantId) builder.orWhere('tenant_id', options.tenantId)
      })
      .select('*')

    return results.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      tenant_id: row.tenant_id,
      notification_name: row.notification_name,
      channels: typeof row.channels === 'string' ? JSON.parse(row.channels) : row.channels,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }))
  }

  async updatePreferences(options: UpdatePreferencesParams): Promise<void> {
    await this.#getConnection().transaction(async (trx) => {
      // Check if preference already exists
      const existing = await trx
        .table(this.#preferencesTableName)
        .where('user_id', options.notifiableId)
        .andWhere((builder) => {
          if (options.notificationName) builder.where('notification_name', options.notificationName)
          else builder.whereNull('notification_name')
        })
        .andWhere((builder) => {
          if (options.tenantId) {
            builder.where('tenant_id', options.tenantId)
          } else {
            builder.whereNull('tenant_id')
          }
        })
        .first()

      if (existing) {
        // Update existing preference
        await trx
          .table(this.#preferencesTableName)
          .where('id', existing.id)
          .update({
            channels: JSON.stringify(options.channelPreferences),
            updated_at: new Date(),
          })
      } else {
        // Insert new preference
        await trx.table(this.#preferencesTableName).insert({
          user_id: options.notifiableId,
          tenant_id: options.tenantId || null,
          notification_name: options.notificationName || null,
          channels: JSON.stringify(options.channelPreferences),
          created_at: new Date(),
          updated_at: new Date(),
        })
      }
    })
  }
}
