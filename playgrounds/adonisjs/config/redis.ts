import { defineConfig } from '@adonisjs/redis'
import env from '#start/env'

export default defineConfig({
  connection: 'main',

  connections: {
    main: {
      host: env.get('REDIS_HOST', '127.0.0.1'),
      port: env.get('REDIS_PORT', 6379),
      password: env.get('REDIS_PASSWORD', ''),
      db: 0,
    },
  },
})
