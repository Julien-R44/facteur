import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    '.': './src/index.ts',
    './types': './src/types.ts',
    './channels/database': './src/channels/database.ts',
    './channels/slack': './src/channels/slack.ts',
    './channels/discord': './src/channels/discord.ts',
  },
  unbundle: true,
  exports: {
    devExports: true,
  },
})
