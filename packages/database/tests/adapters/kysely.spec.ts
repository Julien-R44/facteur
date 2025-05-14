import pg from 'pg'
import { test } from '@japa/runner'
import { createPool } from 'mysql2'
import SQLite from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { createFacteur } from '@facteurjs/core'
import { Kysely, MysqlDialect, PostgresDialect, SqliteDialect } from 'kysely'

import { kyselyAdapter } from '../../src/adapters/kysely.js'
import { DatabaseMessage, databaseChannel } from '../../src/channel.js'

const postgresDialect = new PostgresDialect({
  pool: new pg.Pool({
    database: 'postgres',
    host: 'localhost',
    user: 'postgres',
    password: 'postgres',
    port: 5432,
    max: 10,
  }),
})

const mysqlDialect = new MysqlDialect({
  pool: createPool({
    database: 'mysql',
    host: 'localhost',
    user: 'root',
    password: 'root',
    port: 3306,
    connectionLimit: 10,
  }),
})
const sqliteDialect = new SqliteDialect({ database: new SQLite('./database.sqlite') })

function initFacteur(connection: Kysely<any>) {
  const facteur = createFacteur({
    channels: [databaseChannel({ adapter: kyselyAdapter({ connection }) })],
  })

  return { facteur }
}

test.group('Kysely | Postgres', (group) => {
  let postgres: Kysely<any>

  group.setup(() => {
    postgres = new Kysely<any>({ dialect: postgresDialect })
    return async () => {
      await postgres.schema.dropTable('notifications').execute()
      await postgres.destroy()
    }
  })

  test('insert correctly in database', async ({ assert }) => {
    const { facteur } = initFacteur(postgres)
    const id = randomUUID()
    const msg = facteur.defineMessage({
      name: 'welcome',
      toDatabase: () => {
        return DatabaseMessage.create()
          .setContent({ message: 'Welcome to Facteur' })
          .setNotifiableId(id)
      },
    })

    await msg.send({}, {})

    const result = await postgres.selectFrom('notifications').selectAll().execute()

    assert.deepEqual(result.length, 1)
    assert.containsSubset(result[0], {
      type: 'default', // TODO should be welcome
      content: { message: 'Welcome to Facteur' },
      notifiable_id: id,
      read_at: null,
    })
  })
})

test.group('Kysely | Mysql', (group) => {
  let mysql: Kysely<any>

  group.setup(() => {
    mysql = new Kysely<any>({ dialect: mysqlDialect })

    return async () => {
      await mysql.schema.dropTable('notifications').execute()
      await mysql.destroy()
    }
  })

  test('insert correctly in database', async ({ assert }) => {
    const { facteur } = initFacteur(mysql)
    const id = randomUUID()
    const msg = facteur.defineMessage({
      name: 'welcome',
      toDatabase: () => {
        return DatabaseMessage.create()
          .setContent({ message: 'Welcome to Facteur' })
          .setNotifiableId(id)
      },
    })

    await msg.send({}, {})

    const result = await mysql.selectFrom('notifications').selectAll().execute()

    assert.deepEqual(result.length, 1)
    assert.containsSubset(result[0], {
      type: 'default', // TODO should be welcome
      content: { message: 'Welcome to Facteur' },
      notifiable_id: id,
      read_at: null,
    })
  })
})

test.group('Kysely | Sqlite', (group) => {
  let sqlite: Kysely<any>

  group.setup(() => {
    sqlite = new Kysely<any>({ dialect: sqliteDialect })

    return async () => {
      await sqlite.schema.dropTable('notifications').execute()
      await sqlite.destroy()
    }
  })

  test('insert correctly in database', async ({ assert }) => {
    const { facteur } = initFacteur(sqlite)
    const id = randomUUID()
    const msg = facteur.defineMessage({
      name: 'welcome',
      toDatabase: () => {
        return DatabaseMessage.create()
          .setContent({ message: 'Welcome to Facteur' })
          .setNotifiableId(id)
      },
    })

    await msg.send({}, {})

    const result = await sqlite.selectFrom('notifications').selectAll().execute()

    assert.deepEqual(result.length, 1)
    assert.containsSubset(result[0], {
      type: 'default', // TODO should be welcome
      content: JSON.stringify({ message: 'Welcome to Facteur' }),
      notifiable_id: id,
      read_at: null,
    })
  })
})
