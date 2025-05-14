import { type Kysely, sql } from 'kysely'

import type { DatabaseAdapter, KyselyConfig, SaveToDatabaseParams } from '../types.js'

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
        type: options.type,
        content: JSON.stringify(options.content),
      })
      .execute()
  }

  async createTableIfNotExists(): Promise<void> {
    await this.#connection.schema
      .createTable(this.#tableName)
      .addColumn('id', 'integer', (col) => col.primaryKey().notNull().autoIncrement())
      .addColumn('notifiable_id', 'text', (col) => col.notNull())
      .addColumn('type', 'text', (col) => col.notNull())
      .addColumn('content', 'json', (col) => col.notNull())
      .addColumn('read_at', 'timestamp')
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .ifNotExists()
      .execute()
  }
}
