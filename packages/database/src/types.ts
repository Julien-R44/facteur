import type { Kysely } from 'kysely'

/**
 * The adapter for the database
 */
export interface DatabaseAdapter {
  createTableIfNotExists: () => Promise<void>
  setTableName: (tableName: string) => void
  save: (options: SaveToDatabaseParams) => Promise<void>
}

export interface SaveToDatabaseParams {
  notifiableId: string
  type: string
  content: Record<string, any>
}

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

export interface KyselyConfig {
  connection: Kysely<any>
}
