import type { Notification, NotificationsList, Preferences } from '@facteurjs/client/types'

import { QueryClient } from '@tanstack/react-query'
import { test } from '@japa/runner'

import type { DatabaseContent } from '../src/index.tsx'

import { listPreferencesQueryOptions } from '../src/use_preferences.ts'
import { listNotificationsQueryOptions } from '../src/use_notifications.ts'

function createMockClient(notifiableId: string) {
  return {
    notifiableId,
    notifications: {
      list: async () => [],
      markAs: async () => {},
      markAsRead: async () => {},
      markAsSeen: async () => {},
      markAllAs: async () => {},
      markAllAsRead: async () => {},
      markAllAsSeen: async () => {},
    },
    preferences: {
      list: async () => ({}),
      update: async () => {},
    },
  } as any
}

test.group('Query Keys', () => {
  test('listNotificationsQueryOptions uses correct query key with list discriminator', ({
    assert,
  }) => {
    const client = createMockClient('user-123')
    const options = listNotificationsQueryOptions({}, client)

    assert.deepEqual(options.queryKey, ['facteur', 'notifications', 'list', 'user-123', {}])
  })

  test('listNotificationsQueryOptions includes options in query key', ({ assert }) => {
    const client = createMockClient('user-123')
    const filterOptions = { status: 'unread' as const, limit: 10 }
    const options = listNotificationsQueryOptions(filterOptions, client)

    assert.deepEqual(options.queryKey, [
      'facteur',
      'notifications',
      'list',
      'user-123',
      filterOptions,
    ])
  })

  test('listPreferencesQueryOptions uses correct query key', ({ assert }) => {
    const client = createMockClient('user-123')
    const options = listPreferencesQueryOptions({}, client)

    assert.deepEqual(options.queryKey, ['facteur', 'preferences', 'user-123', undefined])
  })

  test('listPreferencesQueryOptions includes tenantId in query key', ({ assert }) => {
    const client = createMockClient('user-123')
    const options = listPreferencesQueryOptions({ tenantId: 'tenant-456' }, client)

    assert.deepEqual(options.queryKey, ['facteur', 'preferences', 'user-123', 'tenant-456'])
  })

  test('different notifiableIds produce different query keys', ({ assert }) => {
    const client1 = createMockClient('user-1')
    const client2 = createMockClient('user-2')

    const options1 = listNotificationsQueryOptions({}, client1)
    const options2 = listNotificationsQueryOptions({}, client2)

    assert.notDeepEqual(options1.queryKey, options2.queryKey)
    assert.equal(options1.queryKey[3], 'user-1')
    assert.equal(options2.queryKey[3], 'user-2')
  })

  test('notification query keys preserve cache data and error inference', async ({ assert }) => {
    const notification: Notification<DatabaseContent> = {
      id: 'invoice-137',
      notifiableId: 'user-13',
      tenantId: 'tenant-a',
      type: 'invoice_paid',
      content: { amount: 137 },
      status: 'unseen',
      createdAt: '2026-10-04T12:00:00.000Z',
    }
    const client = createMockClient('user-13')
    client.notifications.list = async () => [notification]
    const options = listNotificationsQueryOptions({ tenantId: 'tenant-a' }, client)
    const queryClient = new QueryClient()

    await queryClient.fetchQuery(options)

    // These assignments also verify the query key's data and error tags during typecheck.
    const cached: NotificationsList<DatabaseContent> | undefined = queryClient.getQueryData(
      options.queryKey,
    )
    const error: Error | null | undefined = queryClient.getQueryState<
      unknown,
      { unrelated: true },
      typeof options.queryKey
    >(options.queryKey)?.error
    assert.deepEqual(cached, [notification])
    assert.isNull(error)
  })

  test('preference query keys preserve cache data and error inference', async ({ assert }) => {
    const preferences: Preferences = {
      global: {
        global: { channels: { mail: false, transmit: true } },
        notifications: [],
      },
    }
    const client = createMockClient('user-13')
    client.preferences.list = async () => preferences
    const options = listPreferencesQueryOptions({ tenantId: 'tenant-b' }, client)
    const queryClient = new QueryClient()

    await queryClient.fetchQuery(options)

    const cached: Preferences | undefined = queryClient.getQueryData(options.queryKey)
    const error: Error | null | undefined = queryClient.getQueryState<
      unknown,
      { unrelated: true },
      typeof options.queryKey
    >(options.queryKey)?.error
    assert.deepEqual(cached, preferences)
    assert.isNull(error)
  })
})
