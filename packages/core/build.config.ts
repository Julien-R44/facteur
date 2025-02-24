import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index', 'src/types'],
  outDir: 'build',
  clean: true,
  declaration: true,
  rollup: {
    emitCJS: false,
  },
})
