import { test } from '@japa/runner'

import type { DatabaseAdapter, RawPreferenceRow } from '../src/database/types.ts'

import { createFakeDatabaseAdapter } from './helpers/index.ts'
import { Notification, type NotificationOptions } from '../src/types/index.ts'
import { ChannelResolver } from '../src/notifications/channel_resolver.ts'
import { FacteurDatabase } from '../src/database/database.ts'

class BillingNotification extends Notification<any> {
  static override options: NotificationOptions<any> = {
    name: 'Invoice Paid',
    identifier: 'invoice.paid',
    category: 'billing',
    deliverBy: { email: true, sms: true },
  }
}

function createDatabase(options: {
  rawRows: RawPreferenceRow[]
  identities: Array<{ name: string; identifier: string; category?: string }>
  defaultChannels?: Record<string, boolean> | undefined
  categoryChannels?: Record<string, boolean> | undefined
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
      enabled: true,
      global: { channels: options.defaultChannels ?? { email: true, sms: true } },
      categories: options.categoryChannels
        ? { billing: { channels: options.categoryChannels } }
        : {},
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

  test('does not create duplicate when notification_name differs from name', async ({ assert }) => {
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

  test('keeps the full defaults-expanded read shape without stored preferences', async ({
    assert,
  }) => {
    const db = createDatabase({
      identities: [
        { name: 'Weekly Recap', identifier: 'recap.weekly' },
        { name: 'Issue Assigned', identifier: 'issue.assigned' },
      ],
      defaultChannels: { email: false, sms: true },
      rawRows: [],
    })

    const prefs = await db.getPreferences({ notifiableId: 'user-1', tenantId: 'org-1' })
    const expectedScope = {
      global: { channels: { email: false, sms: true } },
      notifications: [
        {
          notification: { name: 'Weekly Recap', identifier: 'recap.weekly' },
          channels: { email: false, sms: true },
        },
        {
          notification: { name: 'Issue Assigned', identifier: 'issue.assigned' },
          channels: { email: false, sms: true },
        },
      ],
    }

    assert.deepEqual(prefs, {
      global: expectedScope,
      tenants: { 'org-1': expectedScope },
    })

    const tenantChannels = prefs.tenants!['org-1'].notifications[0].channels as Record<
      string,
      boolean
    >
    tenantChannels.email = true
    prefs.tenants!['org-1'].notifications[0].notification.name = 'Tenant recap'
    assert.deepEqual(prefs.global, expectedScope)
    assert.deepEqual(prefs.tenants!['org-1'].notifications[1], expectedScope.notifications[1])
  })

  for (const tenantFirst of [false, true]) {
    test(`isolates stored global and tenant notification channels (tenant first: ${tenantFirst})`, async ({
      assert,
    }) => {
      const globalRow: RawPreferenceRow = {
        id: 1,
        user_id: 'user-1',
        notification_name: 'recap.weekly',
        channels: { email: false },
        created_at: new Date(),
      }
      const tenantRow: RawPreferenceRow = {
        id: 2,
        user_id: 'user-1',
        tenant_id: 'org-1',
        notification_name: 'Weekly Recap',
        channels: { sms: false },
        created_at: new Date(),
      }
      const db = createDatabase({
        identities: [{ name: 'Weekly Recap', identifier: 'recap.weekly' }],
        rawRows: tenantFirst ? [tenantRow, globalRow] : [globalRow, tenantRow],
      })

      const prefs = await db.getPreferences({ notifiableId: 'user-1', tenantId: 'org-1' })

      assert.deepEqual(prefs.global.notifications, [
        {
          notification: { name: 'Weekly Recap', identifier: 'recap.weekly' },
          channels: { email: false, sms: true },
        },
      ])
      assert.deepEqual(prefs.tenants!['org-1'].notifications, [
        {
          notification: { name: 'Weekly Recap', identifier: 'recap.weekly' },
          channels: { email: true, sms: false },
        },
      ])
      assert.deepEqual(globalRow.channels, { email: false })
      assert.deepEqual(tenantRow.channels, { sms: false })
    })
  }
})

test.group('FacteurDatabase | ChannelResolver preferences', () => {
  const cases: Array<{
    name: string
    rows: Array<Pick<RawPreferenceRow, 'tenant_id' | 'notification_name' | 'channels'>>
    defaultChannels?: Record<string, boolean>
    categoryChannels?: Record<string, boolean>
    expected: { email: boolean; sms: boolean }
  }> = [
    {
      name: 'global email opt-out is not masked by discovered notification defaults',
      rows: [{ notification_name: null, channels: { email: false } }],
      expected: { email: false, sms: true },
    },
    {
      name: 'empty tenant defaults do not mask global notification preferences',
      rows: [{ notification_name: 'invoice.paid', channels: { sms: false } }],
      expected: { email: true, sms: false },
    },
    {
      name: 'global notification overrides global user preferences only for stored channels',
      rows: [
        { channels: { email: false, sms: false } },
        { notification_name: 'Invoice Paid', channels: { email: true } },
      ],
      expected: { email: true, sms: false },
    },
    {
      name: 'tenant global overrides global notification and falls through for missing channels',
      rows: [
        { notification_name: 'invoice.paid', channels: { email: true, sms: false } },
        { tenant_id: 'org-1', channels: { email: false } },
      ],
      expected: { email: false, sms: false },
    },
    {
      name: 'tenant notification overrides tenant global without leaking into other channels',
      rows: [
        { channels: { email: false, sms: true } },
        { notification_name: 'invoice.paid', channels: { email: false, sms: true } },
        { tenant_id: 'org-1', channels: { email: false, sms: false } },
        { tenant_id: 'org-1', notification_name: 'invoice.paid', channels: { email: true } },
      ],
      expected: { email: true, sms: false },
    },
    {
      name: 'global user preferences override category and fall through for missing channels',
      rows: [{ channels: { sms: true } }],
      categoryChannels: { email: false, sms: false },
      expected: { email: false, sms: true },
    },
    {
      name: 'category defaults override global configuration defaults with an empty DB',
      rows: [],
      defaultChannels: { email: false, sms: true },
      categoryChannels: { email: true, sms: false },
      expected: { email: true, sms: false },
    },
    {
      name: 'global configuration defaults apply without category preferences',
      rows: [],
      defaultChannels: { email: false, sms: true },
      expected: { email: false, sms: true },
    },
    {
      name: 'deliverBy is the fallback when no preference defines the channel',
      rows: [],
      defaultChannels: { email: false },
      expected: { email: false, sms: true },
    },
    {
      name: 'unrelated stored notification and tenant preferences do not apply',
      rows: [
        { notification_name: 'other.notification', channels: { email: false } },
        { tenant_id: 'other-org', channels: { sms: false } },
      ],
      expected: { email: true, sms: true },
    },
  ]

  for (const scenario of cases) {
    test(scenario.name, async ({ assert }) => {
      const defaultPreferences = {
        enabled: true,
        global: { channels: scenario.defaultChannels ?? { email: true, sms: true } },
        categories: scenario.categoryChannels
          ? { billing: { channels: scenario.categoryChannels } }
          : {},
      }
      const db = createDatabase({
        identities: [{ name: 'Invoice Paid', identifier: 'invoice.paid', category: 'billing' }],
        rawRows: scenario.rows.map((row, index) => ({
          id: index + 1,
          user_id: 'user-1',
          created_at: new Date(),
          ...row,
        })),
        defaultChannels: scenario.defaultChannels,
        categoryChannels: scenario.categoryChannels,
      })
      const resolver = new ChannelResolver(db, defaultPreferences)
      const to = {
        id: 'user-1',
        notificationTargets: () => ({ email: 'alice@example.com', sms: '+33123456789' }),
      }

      // Exercise both absent and present tenant scopes against the same stored rows.
      const tenantIds = scenario.rows.some((row) => row.tenant_id === 'org-1')
        ? ['org-1']
        : [undefined, 'org-1']
      for (const tenantId of tenantIds) {
        const result = await resolver.resolveChannels({
          notification: BillingNotification,
          to,
          params: {},
          ...(tenantId === undefined ? {} : { tenantId }),
        })

        assert.deepEqual(result, {
          email: { shouldSend: scenario.expected.email, target: 'alice@example.com' },
          sms: { shouldSend: scenario.expected.sms, target: '+33123456789' },
        })
      }
    })
  }
})
