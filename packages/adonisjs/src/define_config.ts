import type { Channel } from '@facteurjs/core/types'
import type { ConfigProvider } from '@adonisjs/core/types'

export function defineConfig<Channels extends Record<string, ConfigProvider<Channel>>>(options: {
  channels: Channels
}) {
  return options
}
