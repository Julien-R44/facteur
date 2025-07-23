import type { Kysely } from 'kysely'

import type {
  DatabaseAdapter,
  AdapterGetNotificationsParams,
  KyselyConfig,
  Notification,
  PruneNotificationsParams,
  SaveToDatabaseParams,
  UpdateAllNotificationsParams,
  UpdateNotificationParams,
} from '../types.js'

export function kyselyAdapter(config: KyselyConfig): DatabaseAdapter {
  return new KyselyAdapter(config)
}

class KyselyAdapter implements DatabaseAdapter {
  #tableName!: string
  #connection: Kysely<any>

  constructor(config: KyselyConfig) {
    this.#connection = config.connection
  }

  setTableName(tableName: string) {
    this.#tableName = tableName
  }

  async save(options: SaveToDatabaseParams) {
    await this.#connection
      .insertInto(this.#tableName)
      .values({
        notifiable_id: options.notifiableId,
        tenant_id: options.tenantId || null,
        type: options.type,
        content: JSON.stringify(options.content),
        status: options.status,
        created_at: options.createdAt || new Date(),
        updated_at: options.updatedAt || new Date(),
        tags: options.tags ? JSON.stringify(options.tags) : null,
      })
      .execute()
  }

  async getNotifications(options: AdapterGetNotificationsParams): Promise<Notification[]> {
    const page = options.page || 1
    const limit = Math.min(options.limit || 10, 100)
    const offset = (page - 1) * limit

    const results = await this.#connection
      .selectFrom(this.#tableName)
      .selectAll()
      .where('notifiable_id', '=', options.notifiableId)
      .$if(!!options.tenantId, (qb) => qb.where('tenant_id', '=', options.tenantId))
      .$if(!!options.status, (qb) => qb.where('status', '=', options.status))
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute()

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

    await this.#connection
      .updateTable(this.#tableName)
      .set(updateData)
      .where('id', '=', options.id)
      .execute()
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

    await this.#connection
      .updateTable(this.#tableName)
      .set(updateData)
      .where('notifiable_id', '=', options.notifiableId)
      .$if(!!options.tenantId, (qb) => qb.where('tenant_id', '=', options.tenantId))
      .execute()
  }

  async pruneNotifications(options: PruneNotificationsParams): Promise<void> {
    await this.#connection
      .deleteFrom(this.#tableName)
      .$if(!!options.notifiableId, (qb) => qb.where('notifiable_id', '=', options.notifiableId))
      .$if(!!options.tenantId, (qb) => qb.where('tenant_id', '=', options.tenantId))
      .$if(!!options.olderThan, (qb) => qb.where('created_at', '<', options.olderThan))
      .execute()
  }
}
