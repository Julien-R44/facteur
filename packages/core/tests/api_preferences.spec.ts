import { test } from '@japa/runner'

import type { UpdatePreferencesParams } from '../src/database/types.ts'
import { createFakeDatabaseAdapter, createMockRequest, testProvider } from './helpers/index.ts'
import { Facteur } from '../src/facteur.ts'
import { routes } from '../src/api/index.ts'

function findUpdateRoute(facteur: InstanceType<typeof Facteur>) {
  return routes({ facteur, authorize: () => true }).find(
    (r) =>
      r.route === '/notifications/notifiable/:notifiableId/preferences' && r.method === 'post',
  )!
}

function createFacteurWithSpy() {
  const calls: UpdatePreferencesParams[] = []
  const adapter = createFakeDatabaseAdapter()
  adapter.updatePreferences = async (options) => {
    calls.push(options)
  }

  const facteur = new Facteur({
    channels: { email: testProvider() as any },
    discoverer: { searchDirectory: new URL('./helpers/notifications', import.meta.url) },
    databaseAdapter: adapter,
  })

  return { facteur, calls }
}

async function createFacteurWithSpyAndDiscoverer() {
  const { facteur, calls } = createFacteurWithSpy()
  await facteur.discoverer.discoverNotifications()
  return { facteur, calls }
}

test.group('API Preferences | Global scope', () => {
  test('should update global preferences (no notificationName)', async ({ assert }) => {
    const { facteur, calls } = createFacteurWithSpy()
    const route = findUpdateRoute(facteur)

    const response = await route.handler(
      createMockRequest({
        params: { notifiableId: 'user-123' },
        body: { preferences: { email: false } },
      }),
    )

    assert.equal(response.status, 204)
    assert.lengthOf(calls, 1)
    assert.isUndefined(calls[0].notificationName)
    assert.deepEqual(calls[0].channelPreferences, { email: false })
    assert.equal(calls[0].notifiableId, 'user-123')
  })
})

test.group('API Preferences | Per-notification scope', () => {
  test('should update per-notification preferences', async ({ assert }) => {
    const { facteur, calls } = createFacteurWithSpy()
    const route = findUpdateRoute(facteur)

    const response = await route.handler(
      createMockRequest({
        params: { notifiableId: 'user-123' },
        body: { preferences: { email: true, sms: false }, notificationName: 'recap.weekly' },
      }),
    )

    assert.equal(response.status, 204)
    assert.lengthOf(calls, 1)
    assert.equal(calls[0].notificationName, 'recap.weekly')
    assert.deepEqual(calls[0].channelPreferences, { email: true, sms: false })
  })
})

test.group('API Preferences | Per-category scope', () => {
  test('should update preferences for all notifications in category', async ({ assert }) => {
    const { facteur, calls } = await createFacteurWithSpyAndDiscoverer()
    const route = findUpdateRoute(facteur)

    const response = await route.handler(
      createMockRequest({
        params: { notifiableId: 'user-123' },
        body: { preferences: { sms: false }, category: 'billing' },
      }),
    )

    assert.equal(response.status, 204)
    assert.lengthOf(calls, 2)

    const names = calls.map((c) => c.notificationName).sort()
    assert.deepEqual(names, ['billing.alert', 'billing.report'])

    for (const call of calls) {
      assert.deepEqual(call.channelPreferences, { sms: false })
      assert.equal(call.notifiableId, 'user-123')
    }
  })

  test('should return 400 for unknown category', async ({ assert }) => {
    const { facteur } = await createFacteurWithSpyAndDiscoverer()
    const route = findUpdateRoute(facteur)

    const response = await route.handler(
      createMockRequest({
        params: { notifiableId: 'user-123' },
        body: { preferences: { email: false }, category: 'nonexistent' },
      }),
    )

    assert.equal(response.status, 400)
    assert.deepEqual(response.body, {
      error: 'No notifications found for category "nonexistent"',
    })
  })
})

test.group('API Preferences | Validation', () => {
  test('should reject when both notificationName and category are provided', async ({
    assert,
  }) => {
    const { facteur } = createFacteurWithSpy()
    const route = findUpdateRoute(facteur)

    const response = await route.handler(
      createMockRequest({
        params: { notifiableId: 'user-123' },
        body: {
          preferences: { email: false },
          notificationName: 'recap.weekly',
          category: 'billing',
        },
      }),
    )

    assert.equal(response.status, 400)
    assert.deepEqual(response.body, {
      error: 'Cannot specify both "notificationName" and "category"',
    })
  })
})
