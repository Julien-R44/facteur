import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts', './src/types.ts'],
  unbundle: true,
  dts: true,
  exports: {
    devExports: true,
  },
})
