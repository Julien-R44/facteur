import type { Channel, DefaultPreferences, FacteurConfiguration } from '@facteurjs/core/types'
import type { ConfigProvider } from '@adonisjs/core/types'
import type { HttpContext } from '@adonisjs/core/http'

import type { DatabaseAdapter } from './channels/database.js'

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

export function defineConfig<Channels extends Record<string, ConfigProvider<Channel>>>(
  options: AdonisFacteurConfiguration<Channels>,
) {
  return options
}
