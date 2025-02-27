import { SqliteAdapter, type Kysely, MysqlAdapter, sql } from 'kysely'

import type { DatabaseAdapter, KyselyConfig, SaveToDatabaseParams } from '../types.js'

export function kyselyAdapter(config: KyselyConfig): DatabaseAdapter {
  return new KyselyAdapter(config)
}

class KyselyAdapter implements DatabaseAdapter {
  #dialect: 'mysql' | 'pg' | 'sqlite'
  #tableName!: string
  #connection: Kysely<any>

  constructor(config: KyselyConfig) {
    this.#connection = config.connection

    const adapter = this.#connection.getExecutor().adapter
    if (adapter instanceof SqliteAdapter) {
      this.#dialect = 'sqlite'
    } else if (adapter instanceof MysqlAdapter) {
      this.#dialect = 'mysql'
    } else {
      this.#dialect = 'pg'
    }
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
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('notifiable_id', 'text', (col) => col.notNull())
      .addColumn('type', 'text', (col) => col.notNull())
      .addColumn('content', 'json', (col) => col.notNull())
      .addColumn('read_at', 'timestamp')
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .ifNotExists()
      .execute()
  }
}
