import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/types.ts'],
  unbundle: true,
  exports: { devExports: true },
  external: ['@facteurjs/core'],
})
