import type { DatabaseAdapter, DatabaseConfig, SaveToDatabaseParams } from './types.js'

export class DatabaseProvider {
  #adapter: DatabaseAdapter
  #initialized: Promise<void>

  constructor(adapter: DatabaseAdapter, config: DatabaseConfig) {
    this.#adapter = adapter
    this.#adapter.setTableName(config.tableName || 'notifications')

    if (config.autoCreateTable !== false) {
      this.#initialized = this.#adapter.createTableIfNotExists()
    } else {
      this.#initialized = Promise.resolve()
    }
  }

  /**
   * Remove all items from the cache
   */
  async save(params: SaveToDatabaseParams) {
    await this.#initialized
    await this.#adapter.save(params)
  }
}
