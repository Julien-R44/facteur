import knex from 'knex'
import type { Knex } from 'knex'
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { createFacteur } from '@facteurjs/core'

import { knexAdapter } from '../../src/adapters/knex.js'
import { DatabaseMessage, databaseProvider } from '../../src/provider.js'

function initFacteur(connection: Knex) {
  const facteur = createFacteur({
    providers: [databaseProvider({ adapter: knexAdapter({ connection }) })],
  })

  return { facteur }
}

test.group('Knex | Postgres', (group) => {
  let postgres: Knex

  group.setup(() => {
    postgres = knex({
      client: 'pg',
      connection: {
        host: 'localhost',
        user: 'postgres',
        password: 'postgres',
        port: 5432,
        database: 'postgres',
      },
    })
    return async () => {
      await postgres.schema.dropTable('notifications').catch(() => {})
      await postgres.destroy()
    }
  })

  test('insert correctly in database', async ({ assert }) => {
    const { facteur } = initFacteur(postgres)
    const id = randomUUID()
    const msg = facteur.createMessage({
      name: 'welcome',
      toDatabase: () => {
        return DatabaseMessage.create()
          .setContent({ message: 'Welcome to Facteur' })
          .setNotifiableId(id)
      },
    })

    await msg.send({}, {})

    const result = await postgres.table('notifications').select('*')

    assert.deepEqual(result.length, 1)
    assert.containsSubset(result[0], {
      type: 'default', // TODO should be welcome
      content: { message: 'Welcome to Facteur' },
      notifiable_id: id,
      read_at: null,
    })
  })
})

test.group('Knex | Mysql', (group) => {
  let mysql: Knex

  group.setup(() => {
    mysql = knex({
      client: 'mysql2',
      connection: {
        database: 'mysql',
        host: 'localhost',
        user: 'root',
        password: 'root',
        port: 3306,
      },
    })

    return async () => {
      await mysql.schema.dropTable('notifications').catch(() => {})
      await mysql.destroy()
    }
  })

  test('insert correctly in database', async ({ assert }) => {
    const { facteur } = initFacteur(mysql)
    const id = randomUUID()
    const msg = facteur.createMessage({
      name: 'welcome',
      toDatabase: () => {
        return DatabaseMessage.create()
          .setContent({ message: 'Welcome to Facteur' })
          .setNotifiableId(id)
      },
    })

    await msg.send({}, {})

    const result = await mysql.table('notifications').select('*')

    assert.deepEqual(result.length, 1)
    assert.containsSubset(result[0], {
      type: 'default', // TODO should be welcome
      content: { message: 'Welcome to Facteur' },
      notifiable_id: id,
      read_at: null,
    })
  })
})

test.group('Knex | Sqlite', (group) => {
  let sqlite: Knex

  group.setup(() => {
    sqlite = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    })

    return async () => {
      await sqlite.schema.dropTable('notifications').catch(() => {})
      await sqlite.destroy()
    }
  })

  test('insert correctly in database', async ({ assert }) => {
    const { facteur } = initFacteur(sqlite)
    const id = randomUUID()
    const msg = facteur.createMessage({
      name: 'welcome',
      toDatabase: () => {
        return DatabaseMessage.create()
          .setContent({ message: 'Welcome to Facteur' })
          .setNotifiableId(id)
      },
    })

    await msg.send({}, {})

    const result = await sqlite.table('notifications').select('*')

    assert.deepEqual(result.length, 1)
    assert.containsSubset(result[0], {
      type: 'default', // TODO should be welcome
      content: JSON.stringify({ message: 'Welcome to Facteur' }),
      notifiable_id: id,
      read_at: null,
    })
  })
})
