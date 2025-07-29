import { mapKeys } from '@julr/utils/object'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    '.': './src/index.ts',
    './database': './src/database/index.ts',
    './database/types': './src/database/types.ts',
    './database/adapters/knex': './src/database/adapters/knex.ts',
    './database/adapters/kysely': './src/database/adapters/kysely.ts',
    './channels/slack': './src/channels/slack/index.ts',
    './channels/slack/types': './src/channels/slack/types.ts',
    './channels/discord': './src/channels/discord/index.ts',
    './channels/discord/types': './src/channels/discord/types.ts',
    './channels/transmit': './src/channels/transmit/index.ts',
    './channels/transmit/types': './src/channels/transmit/types.ts',
    './channels/twilio': './src/channels/twilio/index.ts',
    './channels/twilio/types': './src/channels/twilio/types.ts',
    './channels/fcm': './src/channels/fcm/index.ts',
    './channels/fcm/types': './src/channels/fcm/types.ts',
    './channels/webpush': './src/channels/webpush/index.ts',
    './channels/webpush/types': './src/channels/webpush/types.ts',
    './channels/webhook': './src/channels/webhook/index.ts',
    './channels/webhook/types': './src/channels/webhook/types.ts',
    './channels/socketio': './src/channels/socketio/index.ts',
    './channels/socketio/types': './src/channels/socketio/types.ts',
    './api': './src/api/index.ts',
    './api/types': './src/api/types.ts',
    './types': './src/types/index.ts',
  },
  unbundle: true,
  dts: true,
  exports: {
    devExports: true,
    customExports(pkg) {
      return mapKeys(pkg, (key) => (key.endsWith('/index') ? key.slice(0, -6) : key))
    },
  },
  skipNodeModulesBundle: true,
})
