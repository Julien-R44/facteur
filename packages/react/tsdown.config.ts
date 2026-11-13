import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.tsx', './src/types.ts'],
  dts: true,
  exports: {
    devExports: true,
  },
  deps: { neverBundle: true },
})
