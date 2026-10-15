import type { DatabaseAdapter } from '@facteurjs/core/database/types'
import type { ConfigProvider } from '@adonisjs/core/types'

import { test } from '@japa/runner'

import type { InferDatabase } from '../src/types.ts'

import { defineConfig } from '../src/define_config.ts'

type FacteurService = typeof import('../src/services/main.ts').default

test('InferDatabase tells whether the config defines a database adapter', ({ expectTypeOf }) => {
  const withAdapter = defineConfig({
    channels: {},
    databaseAdapter: {} as ConfigProvider<DatabaseAdapter>,
  })
  const withoutAdapter = defineConfig({ channels: {} })

  expectTypeOf<InferDatabase<typeof withAdapter>>().toEqualTypeOf<{ adapter: DatabaseAdapter }>()
  expectTypeOf<InferDatabase<typeof withoutAdapter>>().toEqualTypeOf<{ adapter: null }>()
})

test('facteur service exposes the database layer when not augmented', ({ expectTypeOf }) => {
  expectTypeOf<FacteurService['db']>().not.toBeNever()
  expectTypeOf<FacteurService['db']>().toHaveProperty('getNotifications')
})
