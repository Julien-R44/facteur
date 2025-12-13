import { test } from '@japa/runner'
import { Hono } from 'hono'
import { Facteur } from '@facteurjs/core'
import type { DatabaseAdapter } from '@facteurjs/core/database/types'
import { createHonoFacteurServer, type HonoAuthorizationContext } from '../src/index.js'

function createFakeDatabaseAdapter(): DatabaseAdapter {
  return {
    save: async () => {},
    getNotifications: async () => [],
    updateNotification: async () => {},
    updateAllNotifications: async () => {},
    pruneNotifications: async () => {},
    getPreferences: async () => [],
    updatePreferences: async () => {},
  }
}

function createTestFacteur() {
  const adapter = createFakeDatabaseAdapter()
  const facteur = new Facteur({
    channels: {},
    discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    databaseAdapter: adapter,
  })
  return facteur
}

test.group('Hono Authorization | createHonoFacteurServer', () => {
  test('should return 403 when authorization callback returns false', async ({ assert }) => {
    const app = new Hono()
    const facteur = createTestFacteur()

    createHonoFacteurServer({
      app,
      facteur,
      authorize: () => false,
    })

    const response = await app.request('/notifications/notifiable/user-123/notifications')

    assert.equal(response.status, 403)
    const body = await response.json()
    assert.deepEqual(body, { error: 'Unauthorized' })
  })

  test('should return 200 when authorization callback returns true', async ({ assert }) => {
    const app = new Hono()
    const facteur = createTestFacteur()

    createHonoFacteurServer({
      app,
      facteur,
      authorize: () => true,
    })

    const response = await app.request('/notifications/notifiable/user-123/notifications')

    assert.equal(response.status, 200)
  })

  test('should pass correct context to authorization callback', async ({ assert }) => {
    assert.plan(3)

    const app = new Hono()
    const facteur = createTestFacteur()

    createHonoFacteurServer({
      app,
      facteur,
      authorize: (ctx: HonoAuthorizationContext) => {
        assert.equal(ctx.notifiableId, 'user-123')
        assert.equal(ctx.tenantId, 'tenant-456')
        assert.isDefined(ctx.ctx)
        return true
      },
    })

    await app.request('/notifications/notifiable/user-123/notifications?tenantId=tenant-456')
  })

  test('should provide Hono context in authorization callback', async ({ assert }) => {
    assert.plan(2)

    const app = new Hono()
    const facteur = createTestFacteur()

    createHonoFacteurServer({
      app,
      facteur,
      authorize: (ctx: HonoAuthorizationContext) => {
        assert.isDefined(ctx.ctx.req)
        assert.equal(ctx.ctx.req.param('notifiableId'), 'user-123')
        return true
      },
    })

    await app.request('/notifications/notifiable/user-123/notifications')
  })

  test('should support async authorization callback', async ({ assert }) => {
    const app = new Hono()
    const facteur = createTestFacteur()

    createHonoFacteurServer({
      app,
      facteur,
      authorize: async (ctx: HonoAuthorizationContext) => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return ctx.notifiableId === 'allowed-user'
      },
    })

    const allowedResponse = await app.request(
      '/notifications/notifiable/allowed-user/notifications',
    )
    assert.equal(allowedResponse.status, 200)

    const deniedResponse = await app.request('/notifications/notifiable/denied-user/notifications')
    assert.equal(deniedResponse.status, 403)
  })

  test('should allow all requests when no authorization callback is provided', async ({
    assert,
  }) => {
    const app = new Hono()
    const facteur = createTestFacteur()

    createHonoFacteurServer({ app, facteur })

    const response = await app.request('/notifications/notifiable/any-user/notifications')

    assert.equal(response.status, 200)
  })

  test('should check authorization on POST endpoints', async ({ assert }) => {
    const app = new Hono()
    const facteur = createTestFacteur()

    createHonoFacteurServer({
      app,
      facteur,
      authorize: () => false,
    })

    const response = await app.request('/notifications/notifiable/user-123/mark-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'read' }),
    })

    assert.equal(response.status, 403)
  })

  test('should check authorization for preferences endpoints', async ({ assert }) => {
    const app = new Hono()
    const facteur = createTestFacteur()

    createHonoFacteurServer({
      app,
      facteur,
      authorize: () => false,
    })

    const response = await app.request('/notifications/notifiable/user-123/preferences')

    assert.equal(response.status, 403)
  })
})
