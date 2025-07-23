import type { ConfigProvider } from '@adonisjs/core/types'
import type { Channel, FacteurConfiguration } from '@facteurjs/core/types'

import type { DatabaseAdapter } from './channels/database.js'

export function defineConfig<Channels extends Record<string, ConfigProvider<Channel>>>(options: {
  channels: Channels
  queueAdapter?: FacteurConfiguration['queueAdapter']
  databaseAdapter?: ConfigProvider<DatabaseAdapter>
}) {
  return options
}
