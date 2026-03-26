import { test } from '@japa/runner'

import { FacteurDatabase } from '../src/database/database.ts'
import type { DatabaseAdapter, RawPreferenceRow } from '../src/database/types.ts'
import { createFakeDatabaseAdapter } from './helpers/index.ts'

function createDatabase(options: {
  rawRows: RawPreferenceRow[]
  identities: Array<{ name: string; identifier: string; category?: string }>
  defaultChannels?: Record<string, boolean>
}) {
  const adapter: DatabaseAdapter = {
    ...createFakeDatabaseAdapter(),
    getPreferences: async () => options.rawRows,
  }

  const discoverer = {
    getNotificationIdentities: async () => options.identities,
  }

  const facteurOptions = {
    databaseAdapter: adapter,
    defaultPreferences: {
      global: { channels: options.defaultChannels ?? { email: true, sms: true } },
      categories: {},
    },
  }

  return new FacteurDatabase(facteurOptions as any, discoverer as any)
}

test.group('FacteurDatabase | getPreferences', () => {
  test('merges DB row into discoverer entry when notification_name matches identifier', async ({
    assert,
  }) => {
    const db = createDatabase({
      identities: [{ name: 'Weekly Recap', identifier: 'recap.weekly' }],
      rawRows: [
        {
          id: 1,
          user_id: 'user-1',
          notification_name: 'recap.weekly',
          channels: { email: false },
          created_at: new Date(),
        },
      ],
    })

    const prefs = await db.getPreferences({ notifiableId: 'user-1' })
    const notifications = prefs.global.notifications

    assert.lengthOf(notifications, 1)
    assert.equal(notifications[0].notification.name, 'Weekly Recap')
    assert.equal(notifications[0].notification.identifier, 'recap.weekly')
    assert.isFalse((notifications[0].channels as Record<string, boolean>).email)
  })

  test('does not create duplicate when notification_name differs from name', async ({
    assert,
  }) => {
    const db = createDatabase({
      identities: [
        { name: 'Weekly Recap', identifier: 'recap.weekly' },
        { name: 'Issue Assigned', identifier: 'issue.assigned' },
      ],
      rawRows: [
        {
          id: 1,
          user_id: 'user-1',
          notification_name: 'recap.weekly',
          channels: { email: false },
          created_at: new Date(),
        },
      ],
    })

    const prefs = await db.getPreferences({ notifiableId: 'user-1' })
    const notifications = prefs.global.notifications

    assert.lengthOf(notifications, 2)

    const recaps = notifications.filter((n) => n.notification.identifier === 'recap.weekly')
    assert.lengthOf(recaps, 1)
  })

  test('merges global preferences row (null notification_name)', async ({ assert }) => {
    const db = createDatabase({
      identities: [{ name: 'Weekly Recap', identifier: 'recap.weekly' }],
      rawRows: [
        {
          id: 1,
          user_id: 'user-1',
          notification_name: null,
          channels: { email: false },
          created_at: new Date(),
        },
      ],
    })

    const prefs = await db.getPreferences({ notifiableId: 'user-1' })

    const globalChannels = prefs.global.global.channels as Record<string, boolean>
    assert.isFalse(globalChannels.email)
    assert.isTrue(globalChannels.sms)
  })
})
