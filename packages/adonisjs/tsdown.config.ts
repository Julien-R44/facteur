import { mapKeys } from '@julr/utils/object'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    '.': './src/index.ts',
    './database': './src/database/index.ts',
    './types': './src/types.ts',
    './facteur_provider': './src/providers/facteur_provider.ts',
    './channels/discord': './src/channels/discord.ts',
    './channels/slack': './src/channels/slack.ts',
    './channels/webhook': './src/channels/webhook.ts',
    './services/main': './src/services/main.ts',
  },
  unbundle: true,
  exports: {
    devExports: true,
    customExports(pkg) {
      delete pkg['./providers/facteur_provider.js']
      pkg['./facteur_provider'] = './src/providers/facteur_provider.js'

      return mapKeys(pkg, (key) => (key.endsWith('/index') ? key.slice(0, -6) : key))
    },
  },
  dts: true,
  skipNodeModulesBundle: true,
})
