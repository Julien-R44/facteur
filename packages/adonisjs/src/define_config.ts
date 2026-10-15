import type { Channel, DefaultPreferences, FacteurConfiguration } from '@facteurjs/core/types'
import type { DatabaseAdapter } from '@facteurjs/core/database/types'
import type { ConfigProvider } from '@adonisjs/core/types'
import type { HttpContext } from '@adonisjs/core/http'

export interface AdonisFacteurConfiguration<
  Channels extends Record<string, ConfigProvider<Channel>>,
> {
  channels: Channels
  queueAdapter?: FacteurConfiguration['queueAdapter']
  databaseAdapter?: ConfigProvider<DatabaseAdapter>
  api?: { guard?: (ctx: HttpContext) => Promise<boolean> | boolean }
  preferences?: DefaultPreferences<
    Channels extends Record<string, ConfigProvider<Channel>> ? Record<keyof Channels, any> : never
  >
}

export function defineConfig<
  Channels extends Record<string, ConfigProvider<Channel>>,
  DatabaseProvider extends ConfigProvider<DatabaseAdapter> | undefined = undefined,
>(options: AdonisFacteurConfiguration<Channels> & { databaseAdapter?: DatabaseProvider }) {
  /**
   * Keep the database adapter type so `InferDatabase` can tell
   * whether the config defines one.
   */
  return options as AdonisFacteurConfiguration<Channels> & { databaseAdapter: DatabaseProvider }
}
