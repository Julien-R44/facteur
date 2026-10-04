import type {
  DatabaseAdapter,
  UpdateAllNotificationsParams,
  UpdateNotificationParams,
  UpdatePreferencesParams,
} from '@facteurjs/core/database/types'

import { Hono } from 'hono'
import { test } from '@japa/runner'
import { Facteur } from '@facteurjs/core'

import { createHonoFacteurServer, HonoServerAdapter } from '../src/index.ts'

async function createTestApp(overrides: Partial<DatabaseAdapter> = {}, authorized = true) {
  const adapter: DatabaseAdapter = {
    save: async () => {},
    getNotifications: async () => [],
    updateNotification: async () => {},
    updateAllNotifications: async () => {},
    pruneNotifications: async () => {},
    getPreferences: async () => [],
    updatePreferences: async () => {},
    ...overrides,
  }
  const facteur = new Facteur({
    channels: {},
    discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    databaseAdapter: adapter,
  })
  await facteur.discoverer.discoverNotifications()
  const app = new Hono()
  createHonoFacteurServer({ app, facteur, authorize: () => authorized })
  return app
}

test.group('Hono Responses | public mutation routes', () => {
  test('mark-as should update the notification and return an empty 204', async ({ assert }) => {
    const calls: UpdateNotificationParams[] = []
    const app = await createTestApp({
      getNotifications: async () => [
        {
          id: 'notification-456',
          notifiableId: 'user-123',
          tenantId: 'tenant-789',
          type: 'billing.alert',
          content: { title: 'Payment received' },
          status: 'unread',
        },
      ],
      updateNotification: async (options) => {
        calls.push(options)
      },
    })

    const response = await app.request('/notifications/notifiable/user-123/mark-as', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationId: 'notification-456',
        tenantId: 'tenant-789',
        status: 'read',
      }),
    })

    assert.deepEqual(calls, [
      {
        id: 'notification-456',
        notifiableId: 'user-123',
        tenantId: 'tenant-789',
        status: 'read',
      },
    ])
    assert.equal(response.status, 204)
    assert.isNull(response.body)
    assert.equal(await response.text(), '')
    assert.isNull(response.headers.get('content-type'))
  })

  test('mark-all should update notifications and return an empty 204', async ({ assert }) => {
    const calls: UpdateAllNotificationsParams[] = []
    const app = await createTestApp({
      updateAllNotifications: async (options) => {
        calls.push(options)
      },
    })

    const response = await app.request('/notifications/notifiable/user-123/mark-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-789', status: 'seen' }),
    })

    assert.deepEqual(calls, [{ notifiableId: 'user-123', tenantId: 'tenant-789', status: 'seen' }])
    assert.equal(response.status, 204)
    assert.isNull(response.body)
    assert.equal(await response.text(), '')
    assert.isNull(response.headers.get('content-type'))
  })

  test('preferences should update preferences and return an empty 204')
    .with([undefined, 'billing.alert'])
    .run(async ({ assert }, notificationName) => {
      const calls: UpdatePreferencesParams[] = []
      const app = await createTestApp({
        updatePreferences: async (options) => {
          calls.push(options)
        },
      })

      const response = await app.request('/notifications/notifiable/user-123/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: 'tenant-789',
          notificationName,
          preferences: { email: false, sms: true },
        }),
      })

      assert.deepEqual(calls, [
        {
          notifiableId: 'user-123',
          tenantId: 'tenant-789',
          notificationName,
          channelPreferences: { email: false, sms: true },
        },
      ])
      assert.equal(response.status, 204)
      assert.isNull(response.body)
      assert.equal(await response.text(), '')
      assert.isNull(response.headers.get('content-type'))
    })
})

test.group('Hono Responses | JSON routes', () => {
  test('should preserve notification JSON in a 200 response', async ({ assert }) => {
    const app = await createTestApp({
      getNotifications: async () => [
        {
          id: 'notification-456',
          notifiableId: 'user-123',
          type: 'billing.alert',
          content: { title: 'Payment received' },
          status: 'unread',
        },
      ],
    })

    const response = await app.request('/notifications/notifiable/user-123/notifications')

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'application/json')
    assert.deepEqual(await response.json(), [
      {
        id: 'notification-456',
        notifiableId: 'user-123',
        type: 'billing.alert',
        content: { title: 'Payment received' },
        status: 'unread',
      },
    ])
  })

  test('should preserve preference JSON in a 200 response', async ({ assert }) => {
    const app = await createTestApp({
      getPreferences: async () => [
        {
          id: 'preference-456',
          user_id: 'user-123',
          channels: { email: false, sms: true },
          created_at: new Date('2026-01-01T00:00:00Z'),
        },
      ],
    })

    const response = await app.request('/notifications/notifiable/user-123/preferences')

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'application/json')
    assert.deepEqual(await response.json(), {
      global: { global: { channels: { email: false, sms: true } }, notifications: [] },
    })
  })

  test('should preserve validation JSON in a 400 response', async ({ assert }) => {
    const app = await createTestApp()

    const response = await app.request('/notifications/notifiable/user-123/mark-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-789' }),
    })

    assert.equal(response.status, 400)
    assert.equal(response.headers.get('content-type'), 'application/json')
    assert.deepEqual(await response.json(), { error: 'Status is required' })
  })

  test('should preserve authorization JSON in a 403 response', async ({ assert }) => {
    const app = await createTestApp({}, false)

    const response = await app.request('/notifications/notifiable/user-123/mark-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'read' }),
    })

    assert.equal(response.status, 403)
    assert.equal(response.headers.get('content-type'), 'application/json')
    assert.deepEqual(await response.json(), { error: 'Unauthorized' })
  })
})

test.group('Hono Responses | contentless status codes', () => {
  test('should discard the handler body for status {$self}')
    .with([204, 205, 304])
    .run(async ({ assert }, status) => {
      const app = new Hono()
      new HonoServerAdapter(app).setRoutes([
        {
          method: 'get',
          route: '/empty',
          handler: async () => ({ status, body: { ignored: true } }),
        },
      ])

      const response = await app.request('/empty')

      assert.equal(response.status, status)
      assert.isNull(response.body)
      assert.equal(await response.text(), '')
      assert.isNull(response.headers.get('content-type'))
    })
})
