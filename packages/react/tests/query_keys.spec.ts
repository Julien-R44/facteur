import { test } from '@japa/runner'

import { listNotificationsQueryOptions } from '../src/use_notifications.js'
import { listPreferencesQueryOptions } from '../src/use_preferences.js'

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
})
