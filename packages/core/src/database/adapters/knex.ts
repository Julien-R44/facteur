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
} from '../types.js'

export function knexAdapter(config: KnexConfig): DatabaseAdapter {
  return new KnexAdapter(config)
}

class KnexAdapter implements DatabaseAdapter {
  #tableName: string = 'notifications'
  #connection: Knex

  constructor(config: KnexConfig) {
    this.#connection = config.connection
  }

  setTableName(tableName: string) {
    this.#tableName = tableName
  }

  async save(options: SaveToDatabaseParams) {
    await this.#connection.table(this.#tableName).insert({
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

    let query = this.#connection.table(this.#tableName).where('notifiable_id', options.notifiableId)

    if (options.tenantId) query = query.where('tenant_id', options.tenantId)
    if (options.status) query = query.where('status', options.status)

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

    await this.#connection.table(this.#tableName).where('id', options.id).update(updateData)
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

    let query = this.#connection.table(this.#tableName).where('notifiable_id', options.notifiableId)
    if (options.tenantId) query = query.where('tenant_id', options.tenantId)

    await query.update(updateData)
  }

  async pruneNotifications(options: PruneNotificationsParams): Promise<void> {
    let query = this.#connection.table(this.#tableName)

    if (options.notifiableId) query = query.where('notifiable_id', options.notifiableId)
    if (options.tenantId) query = query.where('tenant_id', options.tenantId)
    if (options.olderThan) query = query.where('created_at', '<', options.olderThan)

    await query.del()
  }
}
