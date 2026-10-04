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
  GetPreferencesParams,
  RawPreferenceRow,
  UpdatePreferencesParams,
} from '../types.ts'

export function kyselyAdapter(config: KyselyConfig): DatabaseAdapter {
  return new KyselyAdapter(config)
}

class KyselyAdapter implements DatabaseAdapter {
  #tableName!: string
  #preferencesTableName: string = 'notification_preferences'
  #connection: Kysely<any>

  constructor(config: KyselyConfig) {
    this.#connection = config.connection
    this.#tableName = config.tableNames?.notifications || 'notifications'
    this.#preferencesTableName = config.tableNames?.preferences || 'notification_preferences'
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
      .$if(!!options.tags, (qb) => qb.where('tags', '@>', JSON.stringify(options.tags)))
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
      .where('notifiable_id', '=', options.notifiableId)
      .$if(options.tenantId === undefined, (qb) => qb.where('tenant_id', 'is', null))
      .$if(options.tenantId !== undefined, (qb) => qb.where('tenant_id', '=', options.tenantId))
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

  async getPreferences(options: GetPreferencesParams): Promise<RawPreferenceRow[]> {
    const results = await this.#connection
      .selectFrom(this.#preferencesTableName)
      .selectAll()
      .where('user_id', '=', options.notifiableId)
      .where((eb) =>
        eb.or([
          eb('tenant_id', 'is', null),
          ...(options.tenantId ? [eb('tenant_id', '=', options.tenantId)] : []),
        ]),
      )
      .execute()

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
    await this.#connection.transaction().execute(async (trx) => {
      // Check if preference already exists
      const existing = await trx
        .selectFrom(this.#preferencesTableName)
        .selectAll()
        .where('user_id', '=', options.notifiableId)
        .$if(!!options.notificationName, (qb) =>
          qb.where('notification_name', '=', options.notificationName),
        )
        .$if(!options.notificationName, (qb) => qb.where('notification_name', 'is', null))
        .$if(!!options.tenantId, (qb) => qb.where('tenant_id', '=', options.tenantId))
        .$if(!options.tenantId, (qb) => qb.where('tenant_id', 'is', null))
        .executeTakeFirst()

      if (existing) {
        // Update existing preference
        await trx
          .updateTable(this.#preferencesTableName)
          .set({
            channels: JSON.stringify(options.channelPreferences),
            updated_at: new Date(),
          })
          .where('id', '=', existing.id)
          .execute()
      } else {
        // Insert new preference
        await trx
          .insertInto(this.#preferencesTableName)
          .values({
            user_id: options.notifiableId,
            tenant_id: options.tenantId || null,
            notification_name: options.notificationName || null,
            channels: JSON.stringify(options.channelPreferences),
            created_at: new Date(),
            updated_at: new Date(),
          })
          .execute()
      }
    })
  }
}
