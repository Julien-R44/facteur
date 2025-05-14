import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/types', 'src/index', 'src/adapters/kysely.ts', 'src/adapters/knex.ts'],
  outDir: 'build',
  clean: true,
  declaration: true,
  rollup: { emitCJS: false },
  externals: ['knex', 'kysely', '@facteurjs/core/types'],
})
