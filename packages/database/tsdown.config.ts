import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/types.ts', 'src/adapters/kysely.ts', 'src/adapters/knex.ts'],
  unbundle: true,
  exports: {
    devExports: true,
  },
})
