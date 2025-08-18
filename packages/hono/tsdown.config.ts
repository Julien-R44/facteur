import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.tsx'],
  dts: true,
  exports: {
    devExports: true,
  },
  skipNodeModulesBundle: true,
})
