import { DatabaseSync, type SQLInputValue } from 'node:sqlite'
import { Kysely, SqliteDialect } from 'kysely'
import knex from 'knex'
import { test } from '@japa/runner'

import type { DatabaseAdapter, UpdateNotificationParams } from '../src/database/types.ts'

import { createFakeDatabaseAdapter, createMockRequest } from './helpers/index.ts'
import { Facteur } from '../src/facteur.ts'
import { databaseChannel, DatabaseMessage } from '../src/database/channel.ts'
import { kyselyAdapter } from '../src/database/adapters/kysely.ts'
import { knexAdapter } from '../src/database/adapters/knex.ts'
import {
  markAllNotificationsAsRoute,
  markNotificationAsRoute,
} from '../src/api/handlers/notifications.ts'

const schema = `CREATE TABLE notifications (
  id INTEGER PRIMARY KEY,
  notifiable_id NUMERIC NOT NULL,
  tenant_id NUMERIC,
  status TEXT NOT NULL,
  read_at INTEGER,
  seen_at INTEGER,
  type TEXT DEFAULT 'test',
  content TEXT DEFAULT '{}',
  tags TEXT,
  created_at INTEGER DEFAULT 123,
  updated_at INTEGER NOT NULL
)`

const seed = `INSERT INTO notifications (id, notifiable_id, tenant_id, status, updated_at) VALUES
  (1, 'user-1', 'tenant-a', 'unseen', 123),
  (2, 'user-2', 'tenant-a', 'unseen', 123),
  (3, 'user-1', 'tenant-b', 'unseen', 123),
  (4, 'user-1', NULL, 'unseen', 123),
  (5, 'user-2', NULL, 'unseen', 123),
  (6, 0, 0, 'unseen', 123),
  (7, 'user-1', '', 'unseen', 123)`

const select = 'SELECT * FROM notifications ORDER BY id'

const fixtures = {
  Knex: () => {
    const connection = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    })
    return {
      adapter: knexAdapter({ connection }),
      execute: async (statement: string) => connection.raw(statement),
      rows: async () => connection.raw(select),
      close: async () => connection.destroy(),
    }
  },
  Kysely: () => {
    const database = new DatabaseSync(':memory:')
    // Match Knex's date binding for SQLite; both production adapters write Date values.
    const bind = (parameters: ReadonlyArray<unknown>) =>
      parameters.map((value) =>
        value instanceof Date ? value.getTime() : (value as SQLInputValue),
      )
    const connection = new Kysely<any>({
      dialect: new SqliteDialect({
        database: {
          close: () => database.close(),
          prepare: (statement) => {
            const prepared = database.prepare(statement)
            return {
              reader: prepared.columns().length > 0,
              all: (parameters) => prepared.all(...bind(parameters)),
              run: (parameters) => prepared.run(...bind(parameters)),
              iterate: (parameters) => prepared.iterate(...bind(parameters)),
            }
          },
        },
      }),
    })
    return {
      adapter: kyselyAdapter({ connection }),
      execute: async (statement: string) => database.exec(statement),
      // Inspect storage directly, independently of Kysely's statement shim.
      rows: async () => database.prepare(select).all(),
      close: async () => connection.destroy(),
    }
  },
}

const allowed: Array<{ title: string; options: UpdateNotificationParams }> = [
  {
    title: 'matching user and tenant',
    options: { id: 1, notifiableId: 'user-1', tenantId: 'tenant-a', status: 'read' },
  },
  {
    title: 'matching user without a tenant',
    options: { id: 4, notifiableId: 'user-1', tenantId: undefined, status: 'seen' },
  },
  {
    title: 'numeric zero identifiers',
    options: { id: 6, notifiableId: 0, tenantId: 0, status: 'read' },
  },
  {
    title: 'empty string tenant identifier',
    options: { id: 7, notifiableId: 'user-1', tenantId: '', status: 'seen' },
  },
]

const denied: Array<{ title: string; options: UpdateNotificationParams }> = [
  {
    title: 'another user in the same tenant',
    options: { id: 2, notifiableId: 'user-1', tenantId: 'tenant-a', status: 'read' },
  },
  {
    title: 'the same user in another tenant',
    options: { id: 3, notifiableId: 'user-1', tenantId: 'tenant-a', status: 'read' },
  },
  {
    title: 'a tenant notification when tenantId is omitted',
    options: { id: 1, notifiableId: 'user-1', tenantId: undefined, status: 'seen' },
  },
  {
    title: 'a global notification from a tenant scope',
    options: { id: 4, notifiableId: 'user-1', tenantId: 'tenant-a', status: 'seen' },
  },
  {
    title: 'another user without a tenant',
    options: { id: 5, notifiableId: 'user-1', tenantId: undefined, status: 'read' },
  },
  {
    title: 'a different tenant when tenantId is zero',
    options: { id: 1, notifiableId: 'user-1', tenantId: 0, status: 'read' },
  },
  {
    title: 'a different tenant when tenantId is empty',
    options: { id: 1, notifiableId: 'user-1', tenantId: '', status: 'read' },
  },
  {
    title: 'an unknown notification',
    options: { id: 99, notifiableId: 'user-1', tenantId: 'tenant-a', status: 'read' },
  },
]

for (const [name, createFixture] of Object.entries(fixtures)) {
  for (const layer of ['adapter', 'API'] as const) {
    test.group(`Notification ownership | ${name} | ${layer}`, (group) => {
      let fixture: ReturnType<typeof createFixture>

      group.each.setup(async () => {
        fixture = createFixture()
        await fixture.execute(schema)
        await fixture.execute(seed)
      })

      group.each.teardown(async () => {
        await fixture.close()
      })

      async function mark(options: UpdateNotificationParams) {
        const facteur = new Facteur({
          channels: {},
          discoverer: { searchDirectory: new URL('./helpers/notifications', import.meta.url) },
          databaseAdapter: fixture.adapter,
        })
        const route = markNotificationAsRoute({
          facteur,
          authorize: (context) =>
            context.notifiableId === options.notifiableId && context.tenantId === options.tenantId,
        })
        const response = await route.handler(
          createMockRequest({
            params: { notifiableId: options.notifiableId },
            body: {
              notificationId: options.id,
              status: options.status,
              // Only the URL user and body tenant belong to the authorized scope.
              notifiableId: 'user-2',
              ...(options.tenantId === undefined ? {} : { tenantId: options.tenantId }),
            },
            query: { tenantId: 'tenant-b' },
          }),
        )
        return response
      }

      for (const { title, options } of allowed) {
        test(`updates only the target for ${title}`, async ({ assert }) => {
          const before = await fixture.rows()
          assert.lengthOf(before, 7)
          if (layer === 'API') assert.equal((await mark(options)).status, 204)
          else await fixture.adapter.updateNotification(options)

          const after = await fixture.rows()
          assert.deepEqual(
            after.filter((row: any) => row.id !== options.id),
            before.filter((row: any) => row.id !== options.id),
          )
          const target = after.find((row: any) => row.id === options.id) as any
          assert.equal(target.status, options.status)
          assert.isAbove(Number(target.updated_at), 123)
          assert.isAbove(Number(target[options.status === 'read' ? 'read_at' : 'seen_at']), 123)
          assert.isNull(target[options.status === 'read' ? 'seen_at' : 'read_at'])
        })
      }

      for (const { title, options } of denied) {
        test(`does not modify ${title}`, async ({ assert }) => {
          const before = await fixture.rows()
          assert.lengthOf(before, 7)
          if (layer === 'API') assert.equal((await mark(options)).status, 204)
          else await fixture.adapter.updateNotification(options)

          // Check timestamps as well as status: a rejected update must change nothing.
          assert.deepEqual(await fixture.rows(), before)
        })
      }

      if (layer === 'API') {
        test('does not write when authorization fails', async ({ assert }) => {
          const before = await fixture.rows()
          const calls: UpdateNotificationParams[] = []
          const adapter: DatabaseAdapter = {
            ...createFakeDatabaseAdapter(),
            updateNotification: async (options) => {
              calls.push(options)
              await fixture.adapter.updateNotification(options)
            },
          }
          const facteur = new Facteur({
            channels: {},
            discoverer: { searchDirectory: new URL('./helpers/notifications', import.meta.url) },
            databaseAdapter: adapter,
          })
          const route = markNotificationAsRoute({ facteur, authorize: () => false })
          const response = await route.handler(
            createMockRequest({
              params: { notifiableId: 'user-1' },
              body: { notificationId: 1, status: 'read', tenantId: 'tenant-a' },
            }),
          )

          assert.equal(response.status, 403)
          assert.deepEqual(calls, [])
          assert.deepEqual(await fixture.rows(), before)
        })
      }
    })
  }

  test.group(`Database identifier scopes | ${name}`, (group) => {
    let fixture: ReturnType<typeof createFixture>

    group.each.setup(async () => {
      fixture = createFixture()
      await fixture.execute(schema)
      await fixture.execute(seed)
      await fixture.execute(`INSERT INTO notifications
        (id, notifiable_id, tenant_id, status, updated_at) VALUES
        (8, 'user-1', 0, 'unseen', 123),
        (9, '', 'tenant-a', 'unseen', 123)`)
      await fixture.execute(`CREATE TABLE notification_preferences (
        id INTEGER PRIMARY KEY, user_id NUMERIC NOT NULL, tenant_id NUMERIC,
        notification_name TEXT, channels TEXT, created_at INTEGER, updated_at INTEGER
      )`)
    })

    group.each.teardown(async () => {
      await fixture.close()
    })

    const tenantScopes = [
      { tenantId: 0, ids: [8], pruneIds: [6, 8] },
      { tenantId: '', ids: [7], pruneIds: [7] },
      { tenantId: 'tenant-a', ids: [1], pruneIds: [1, 2, 9] },
      { tenantId: undefined, ids: [1, 3, 4, 7, 8], pruneIds: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
    ]

    test('lists only notifications within the supplied tenant scope')
      .with(tenantScopes)
      .run(async ({ assert }, { tenantId, ids }) => {
        const notifications = await fixture.adapter.getNotifications({
          notifiableId: 'user-1',
          tenantId,
        })
        assert.sameMembers(
          notifications.map((row) => row.id),
          ids,
        )
      })

    test('mark-all respects the authorized tenant scope')
      .with(tenantScopes)
      .run(async ({ assert }, { tenantId, ids }) => {
        const before = await fixture.rows()
        const facteur = new Facteur({
          channels: {},
          discoverer: { searchDirectory: new URL('./helpers/notifications', import.meta.url) },
          databaseAdapter: fixture.adapter,
        })
        const route = markAllNotificationsAsRoute({
          facteur,
          authorize: (context) =>
            context.notifiableId === 'user-1' && context.tenantId === tenantId,
        })
        const response = await route.handler(
          createMockRequest({
            params: { notifiableId: 'user-1' },
            body: { tenantId, status: 'read' },
          }),
        )
        assert.equal(response.status, 204)
        const after = await fixture.rows()
        assert.deepEqual(
          after.filter((row: any) => !ids.includes(row.id)),
          before.filter((row: any) => !ids.includes(row.id)),
        )
        assert.sameMembers(
          after.filter((row: any) => row.status === 'read').map((row: any) => row.id),
          ids,
        )
      })

    test('prunes only notifications within the supplied user scope')
      .with([
        { notifiableId: 0, ids: [6] },
        { notifiableId: '', ids: [9] },
        { notifiableId: 'user-1', ids: [1, 3, 4, 7, 8] },
        { notifiableId: undefined, ids: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
      ])
      .run(async ({ assert }, { notifiableId, ids }) => {
        const before = await fixture.rows()
        await fixture.adapter.pruneNotifications(notifiableId === undefined ? {} : { notifiableId })
        assert.deepEqual(
          await fixture.rows(),
          before.filter((row: any) => !ids.includes(row.id)),
        )
      })

    test('prunes only notifications within the supplied tenant scope')
      .with(tenantScopes)
      .run(async ({ assert }, { tenantId, pruneIds }) => {
        const before = await fixture.rows()
        await fixture.adapter.pruneNotifications(tenantId === undefined ? {} : { tenantId })
        assert.deepEqual(
          await fixture.rows(),
          before.filter((row: any) => !pruneIds.includes(row.id)),
        )
      })

    test('preserves tenant identifiers when saving notifications')
      .with([0, '', 'tenant-a', undefined])
      .run(async ({ assert }, tenantId) => {
        await fixture.adapter.save({
          notifiableId: 'new-user',
          tenantId,
          type: 'test',
          content: { invoice: 42 },
          status: 'unseen',
        })
        const saved = (await fixture.rows()).find(
          (row: any) => row.notifiable_id === 'new-user',
        ) as any
        assert.strictEqual(saved.tenant_id, tenantId ?? null)
      })

    test('keeps tenant preferences separate from global preferences')
      .with([0, '', 'tenant-a'])
      .run(async ({ assert }, tenantId) => {
        await fixture.adapter.updatePreferences({
          notifiableId: 'user-1',
          channelPreferences: { email: true },
        })
        await fixture.adapter.updatePreferences({
          notifiableId: 'user-1',
          tenantId,
          channelPreferences: { email: true },
        })
        await fixture.adapter.updatePreferences({
          notifiableId: 'user-1',
          tenantId,
          channelPreferences: { email: false },
        })
        const rows = await fixture.adapter.getPreferences({ notifiableId: 'user-1', tenantId })
        assert.lengthOf(rows, 2)
        assert.deepEqual(rows.find((row) => row.tenant_id === null)?.channels, { email: true })
        assert.deepEqual(rows.find((row) => row.tenant_id === tenantId)?.channels, { email: false })
        const facteur = new Facteur({
          channels: {},
          discoverer: { searchDirectory: new URL('./helpers/notifications', import.meta.url) },
          databaseAdapter: fixture.adapter,
        })
        await facteur.discoverer.discoverNotifications()
        const preferences = await facteur.db.getPreferences({ notifiableId: 'user-1', tenantId })
        assert.deepEqual(preferences.global.global.channels, { email: true })
        assert.deepEqual(preferences.tenants?.[tenantId].global.channels, { email: false })
      })

    test('preserves explicit message and target identifiers through the database channel')
      .with([0, ''])
      .run(async ({ assert }, identifier) => {
        const channel = databaseChannel({ adapter: fixture.adapter })
        await channel.send({
          message: DatabaseMessage.create()
            .setType('message-scope')
            .setNotifiableId(identifier)
            .setTenantId(identifier),
          targets: { notifiableId: 'wrong-user', tenantId: 'wrong-tenant' },
          tenantId: 'fallback-tenant',
        })
        await channel.send({
          message: DatabaseMessage.create().setType('target-scope'),
          targets: { notifiableId: identifier, tenantId: identifier },
          tenantId: 'fallback-tenant',
        })
        const saved = (await fixture.rows()).filter(
          (row: any) => row.type === 'message-scope' || row.type === 'target-scope',
        )
        assert.lengthOf(saved, 2)
        for (const row of saved) {
          assert.strictEqual((row as any).notifiable_id, identifier)
          assert.strictEqual((row as any).tenant_id, identifier)
        }
      })
  })
}

test('updateNotification requires both user and explicit tenant scope', ({ expectTypeOf }) => {
  expectTypeOf<{ id: string; status: 'read' }>().not.toMatchTypeOf<UpdateNotificationParams>()
  expectTypeOf<{
    id: string
    notifiableId: string
    status: 'read'
  }>().not.toMatchTypeOf<UpdateNotificationParams>()
  expectTypeOf<{
    id: string
    notifiableId: string
    tenantId: undefined
    status: 'read'
  }>().toMatchTypeOf<UpdateNotificationParams>()
})
