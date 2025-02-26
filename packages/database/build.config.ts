import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index', 'src/adapters/kysely.ts'],
  outDir: 'build',
  clean: true,
  declaration: true,
  rollup: { emitCJS: false },
})
