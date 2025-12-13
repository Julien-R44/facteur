import { defineConfig } from 'tsdown'
import { mapKeys } from '@julr/utils/object'

export default defineConfig({
  entry: {
    '.': './src/index.ts',
    './database': './src/database/index.ts',
    './types': './src/types.ts',
    './facteur_provider': './src/providers/facteur_provider.ts',
    './channels/discord': './src/channels/discord.ts',
    './channels/slack': './src/channels/slack.ts',
    './channels/webhook': './src/channels/webhook.ts',
    './channels/database': './src/channels/database.ts',
    './channels/transmit': './src/channels/transmit.ts',
    './channels/twilio': './src/channels/twilio.ts',
    './channels/aws-sns': './src/channels/aws-sns.ts',
    './channels/socketio': './src/channels/socketio.ts',
    './channels/fcm': './src/channels/fcm.ts',
    './channels/webpush': './src/channels/webpush.ts',
    './channels/expo': './src/channels/expo.ts',
    './services/main': './src/services/main.ts',
  },
  unbundle: true,
  copy: [
    {
      from: './stubs',
      to: './dist/adonisjs/stubs',
    },
  ],
  clean: true,
  exports: {
    devExports: true,
    customExports(pkg) {
      delete pkg['./providers/facteur_provider']
      pkg['./facteur_provider'] = './dist/providers/facteur_provider.js'

      return mapKeys(pkg, (key) => (key.endsWith('/index') ? key.slice(0, -6) : key))
    },
  },
  dts: true,
  skipNodeModulesBundle: true,
})
