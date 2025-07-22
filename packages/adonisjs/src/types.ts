import type { ConfigProvider } from '@adonisjs/core/types'

export * from '@facteurjs/core/types'

export type InferChannels<T> = T extends { channels: infer Channels }
  ? {
      [K in keyof Channels]: Channels[K] extends ConfigProvider<infer P> ? P : never
    }
  : never
