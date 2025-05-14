import { FacteurConfiguration, Provider } from '@facteurjs/core/types'

export function defineConfig<Providers extends Record<string, Provider>>(
  config: Omit<FacteurConfiguration<Providers>, 'logger' | 'emitter'>
) {
  return config
}
