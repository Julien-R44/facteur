import { ConfigProvider } from '@adonisjs/core/types'
import { Channel } from '@facteurjs/core/types'

export function defineConfig<Channels extends Record<string, ConfigProvider<Channel>>>(options: {
  channels: Channels
}) {
  return options
}

export type InferChannels<T> = T extends { channels: infer Channels }
  ? {
      [K in keyof Channels]: Channels[K] extends ConfigProvider<infer P> ? P : never
    }
  : never
