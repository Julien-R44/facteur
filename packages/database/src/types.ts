import type { Knex } from 'knex'
import type { Kysely } from 'kysely'

/**
 * The interface for implementing a new database adapter
 */
export interface DatabaseAdapter {
  save: (options: SaveToDatabaseParams) => Promise<void>
  createTableIfNotExists: () => Promise<void>
  setTableName: (tableName: string) => void
}

export interface SaveToDatabaseParams {
  notifiableId: string
  type: string
  content: Record<string, any>
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

  /**
   * If the table should be created automatically
   * @default true
   */
  autoCreateTable?: boolean
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
