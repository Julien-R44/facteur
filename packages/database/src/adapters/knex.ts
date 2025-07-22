import type { Knex } from 'knex'

import type { DatabaseAdapter, KnexConfig, SaveToDatabaseParams } from '../types.js'

export function knexAdapter(config: KnexConfig): DatabaseAdapter {
  return new KnexAdapter(config)
}

class KnexAdapter implements DatabaseAdapter {
  #tableName!: string
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
      type: options.type,
      content: JSON.stringify(options.content),
      created_at: options.createdAt || new Date(),
      updated_at: options.updatedAt || new Date(),
      tags: options.tags ? JSON.stringify(options.tags) : null,
    })
  }

  async createTableIfNotExists(): Promise<void> {
    const hasTable = await this.#connection.schema.hasTable(this.#tableName)
    if (hasTable) return

    await this.#connection.schema.createTable(this.#tableName, (table) => {
      table.increments('id').primary()
      table.text('notifiable_id').notNullable()
      table.text('type').notNullable()
      table.json('content').notNullable()
      table.timestamp('read_at')
      table.timestamp('created_at').defaultTo(this.#connection.fn.now())
    })
  }
}
