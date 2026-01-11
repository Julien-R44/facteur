import { test } from '@japa/runner'

import { createFacteurWithDb, createMockRequest } from './helpers/index.ts'
import { routes } from '../src/api/index.ts'

test.group('API Authorization | getPreferencesRoute', () => {
  test('should return 403 when authorization fails', async ({ assert }) => {
    const { facteur } = createFacteurWithDb()

    const allRoutes = routes({ facteur, authorize: () => false })

    const getPreferencesRoute = allRoutes.find(
      (r) =>
        r.route === '/notifications/notifiable/:notifiableId/preferences' && r.method === 'get',
    )!

    const response = await getPreferencesRoute.handler(
      createMockRequest({ params: { notifiableId: 'user-123' }, query: {} }),
    )

    assert.equal(response.status, 403)
    assert.deepEqual(response.body, { error: 'Unauthorized' })
  })

  test('should pass correct context to authorization callback', async ({ assert }) => {
    assert.plan(3)

    const { facteur } = createFacteurWithDb()

    const allRoutes = routes({
      facteur,
      authorize: (ctx) => {
        assert.equal(ctx.notifiableId, 'user-123')
        assert.equal(ctx.tenantId, 'tenant-456')
        assert.deepEqual(ctx.request.params, { notifiableId: 'user-123' })
        return false
      },
    })

    const getPreferencesRoute = allRoutes.find(
      (r) =>
        r.route === '/notifications/notifiable/:notifiableId/preferences' && r.method === 'get',
    )!

    await getPreferencesRoute.handler(
      createMockRequest({
        params: { notifiableId: 'user-123' },
        query: { tenantId: 'tenant-456' },
      }),
    )
  })

  test('should reject when user tries to access another users preferences', async ({ assert }) => {
    const { facteur } = createFacteurWithDb()
    const authenticatedUserId = 'user-123'

    const allRoutes = routes({
      facteur,
      authorize: (ctx) => ctx.notifiableId === authenticatedUserId,
    })

    const getPreferencesRoute = allRoutes.find(
      (r) =>
        r.route === '/notifications/notifiable/:notifiableId/preferences' && r.method === 'get',
    )!

    const response = await getPreferencesRoute.handler(
      createMockRequest({ params: { notifiableId: 'other-user-456' }, query: {} }),
    )

    assert.equal(response.status, 403)
  })
})

test.group('API Authorization | updatePreferencesRoute', () => {
  test('should return 403 when authorization fails', async ({ assert }) => {
    const { facteur } = createFacteurWithDb()

    const allRoutes = routes({ facteur, authorize: () => false })

    const updatePreferencesRoute = allRoutes.find(
      (r) =>
        r.route === '/notifications/notifiable/:notifiableId/preferences' && r.method === 'post',
    )!

    const response = await updatePreferencesRoute.handler(
      createMockRequest({
        params: { notifiableId: 'user-123' },
        body: { preferences: { email: true } },
      }),
    )

    assert.equal(response.status, 403)
    assert.deepEqual(response.body, { error: 'Unauthorized' })
  })

  test('should pass tenantId from body to authorization callback', async ({ assert }) => {
    assert.plan(2)

    const { facteur } = createFacteurWithDb()

    const allRoutes = routes({
      facteur,
      authorize: (ctx) => {
        assert.equal(ctx.notifiableId, 'user-123')
        assert.equal(ctx.tenantId, 'tenant-from-body')
        return false
      },
    })

    const updatePreferencesRoute = allRoutes.find(
      (r) =>
        r.route === '/notifications/notifiable/:notifiableId/preferences' && r.method === 'post',
    )!

    await updatePreferencesRoute.handler(
      createMockRequest({
        params: { notifiableId: 'user-123' },
        body: { tenantId: 'tenant-from-body', preferences: { email: true } },
      }),
    )
  })
})

test.group('API Authorization | getNotificationRoute', () => {
  test('should return 403 when authorization fails', async ({ assert }) => {
    const { facteur } = createFacteurWithDb()

    const allRoutes = routes({
      facteur,
      authorize: () => false,
    })

    const getNotificationRoute = allRoutes.find(
      (r) =>
        r.route === '/notifications/notifiable/:notifiableId/notifications' && r.method === 'get',
    )!

    const response = await getNotificationRoute.handler(
      createMockRequest({
        params: { notifiableId: 'user-123' },
        query: {},
      }),
    )

    assert.equal(response.status, 403)
    assert.deepEqual(response.body, { error: 'Unauthorized' })
  })

  test('should return 200 when authorization succeeds', async ({ assert }) => {
    const { facteur } = createFacteurWithDb()

    const allRoutes = routes({
      facteur,
      authorize: () => true,
    })

    const getNotificationRoute = allRoutes.find(
      (r) =>
        r.route === '/notifications/notifiable/:notifiableId/notifications' && r.method === 'get',
    )!

    const response = await getNotificationRoute.handler(
      createMockRequest({
        params: { notifiableId: 'user-123' },
        query: {},
      }),
    )

    assert.equal(response.status, 200)
  })
})

test.group('API Authorization | markNotificationAsRoute', () => {
  test('should return 403 when authorization fails', async ({ assert }) => {
    const { facteur } = createFacteurWithDb()

    const allRoutes = routes({
      facteur,
      authorize: () => false,
    })

    const markNotificationAsRoute = allRoutes.find(
      (r) => r.route === '/notifications/notifiable/:notifiableId/mark-as' && r.method === 'post',
    )!

    const response = await markNotificationAsRoute.handler(
      createMockRequest({
        params: { notifiableId: 'user-123' },
        body: { notificationId: 'notif-1', status: 'read' },
      }),
    )

    assert.equal(response.status, 403)
    assert.deepEqual(response.body, { error: 'Unauthorized' })
  })

  test('should check authorization before validation', async ({ assert }) => {
    const { facteur } = createFacteurWithDb()

    const allRoutes = routes({
      facteur,
      authorize: () => false,
    })

    const markNotificationAsRoute = allRoutes.find(
      (r) => r.route === '/notifications/notifiable/:notifiableId/mark-as' && r.method === 'post',
    )!

    // Even with missing required fields, should return 403 first
    const response = await markNotificationAsRoute.handler(
      createMockRequest({
        params: { notifiableId: 'user-123' },
        body: {},
      }),
    )

    assert.equal(response.status, 403)
  })
})

test.group('API Authorization | markAllNotificationsAsRoute', () => {
  test('should return 403 when authorization fails', async ({ assert }) => {
    const { facteur } = createFacteurWithDb()

    const allRoutes = routes({
      facteur,
      authorize: () => false,
    })

    const markAllNotificationsAsRoute = allRoutes.find(
      (r) => r.route === '/notifications/notifiable/:notifiableId/mark-all' && r.method === 'post',
    )!

    const response = await markAllNotificationsAsRoute.handler(
      createMockRequest({
        params: { notifiableId: 'user-123' },
        body: { status: 'read' },
      }),
    )

    assert.equal(response.status, 403)
    assert.deepEqual(response.body, { error: 'Unauthorized' })
  })

  test('should pass tenantId from body to authorization callback', async ({ assert }) => {
    assert.plan(2)

    const { facteur } = createFacteurWithDb()

    const allRoutes = routes({
      facteur,
      authorize: (ctx) => {
        assert.equal(ctx.notifiableId, 'user-123')
        assert.equal(ctx.tenantId, 'tenant-789')
        return false
      },
    })

    const markAllNotificationsAsRoute = allRoutes.find(
      (r) => r.route === '/notifications/notifiable/:notifiableId/mark-all' && r.method === 'post',
    )!

    await markAllNotificationsAsRoute.handler(
      createMockRequest({
        params: { notifiableId: 'user-123' },
        body: { tenantId: 'tenant-789', status: 'read' },
      }),
    )
  })
})

test.group('API Authorization | async authorization', () => {
  test('should support async authorization callback', async ({ assert }) => {
    const { facteur } = createFacteurWithDb()

    const allRoutes = routes({
      facteur,
      authorize: async (ctx) => {
        // Simulate async check (e.g., database lookup)
        await new Promise((resolve) => setTimeout(resolve, 10))
        return ctx.notifiableId === 'allowed-user'
      },
    })

    const getNotificationRoute = allRoutes.find(
      (r) =>
        r.route === '/notifications/notifiable/:notifiableId/notifications' && r.method === 'get',
    )!

    const allowedResponse = await getNotificationRoute.handler(
      createMockRequest({
        params: { notifiableId: 'allowed-user' },
        query: {},
      }),
    )
    assert.equal(allowedResponse.status, 200)

    const deniedResponse = await getNotificationRoute.handler(
      createMockRequest({
        params: { notifiableId: 'denied-user' },
        query: {},
      }),
    )
    assert.equal(deniedResponse.status, 403)
  })
})

test.group('API Authorization | authorization is required', () => {
  test('should throw when authorization callback calls authorize without callback', async ({
    assert,
  }) => {
    const { facteur } = createFacteurWithDb()

    // @ts-expect-error - Testing runtime behavior when authorize is not provided
    const allRoutes = routes({ facteur })

    const getNotificationRoute = allRoutes.find(
      (r) =>
        r.route === '/notifications/notifiable/:notifiableId/notifications' && r.method === 'get',
    )!

    await assert.rejects(() =>
      getNotificationRoute.handler(
        createMockRequest({
          params: { notifiableId: 'any-user' },
          query: {},
        }),
      ),
    )
  })
})
