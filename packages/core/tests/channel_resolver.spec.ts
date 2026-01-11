import { test } from '@japa/runner'

import { FakeDatabase } from './helpers/index.ts'
import { Notification, type NotificationOptions, type ResolvedDefaultPreferences } from '../src/types/index.ts'
import { ChannelResolver } from '../src/notifications/channel_resolver.ts'

class NotifA extends Notification<any> {
  static override options: NotificationOptions<any> = {
    name: 'FakeNotification',
    deliverBy: { email: true, sms: true },
  }
}

class CriticalNotif extends Notification<any> {
  static override options: NotificationOptions<any> = {
    name: 'CriticalNotification',
    critical: true,
    deliverBy: { email: true, sms: true },
  }
}

class BillingNotif extends Notification<any> {
  static override options: NotificationOptions<any> = {
    name: 'BillingNotification',
    category: 'billing',
    deliverBy: { email: true, sms: true },
  }
}

test.group('Channel Resolver | via', () => {
  test('should only use "via" channels when provided', async ({ assert }) => {
    const result = await new ChannelResolver().resolveChannels({
      to: { id: 'user-123' } as any,
      notification: NotifA,
      params: {},
      via: { sms: { to: '1234567890' } },
    })

    assert.deepEqual(result, {
      sms: { shouldSend: true, target: { to: '1234567890' } },
    })
  })

  test('should use notifiable targets if present', async ({ assert }) => {
    const result = await new ChannelResolver().resolveChannels({
      to: {
        id: 'user-123',
        notificationTargets: () => ({ email: { to: 'foo@ok.com' } }),
      } as any,
      notification: NotifA,
      params: {},
      via: { email: true },
    })

    assert.deepEqual(result, {
      email: { shouldSend: true, target: { to: 'foo@ok.com' } },
    })
  })

  test('ignore notifiable targets if via include it', async ({ assert }) => {
    const result = await new ChannelResolver().resolveChannels({
      to: {
        id: 'user-123',
        notificationTargets: () => ({ email: { to: 'foo@ok.com' } }),
      } as any,
      notification: NotifA,
      params: {},
      via: { email: { to: 'foo2@ok.com' } },
    })

    assert.deepEqual(result, {
      email: { shouldSend: true, target: { to: 'foo2@ok.com' } },
    })
  })

  test('ignore preferences if via is provided', async ({ assert }) => {
    const result = await new ChannelResolver(new FakeDatabase()).resolveChannels({
      to: { id: 'user-123' } as any,
      notification: NotifA,
      params: {},
      via: { email: true },
    })

    assert.deepEqual(result, {
      email: { shouldSend: true, target: null },
    })
  })
})

test.group('Channel resolver | deliverBy', () => {
  test('use deliverBy and notificationTargets', async ({ assert }) => {
    const result = await new ChannelResolver().resolveChannels({
      to: {
        id: 'user-123',
        notificationTargets: () => ({ email: { to: 'foo@ok.com' }, sms: { to: '1234567890' } }),
      } as any,
      notification: NotifA,
      params: {},
    })

    assert.deepEqual(result, {
      email: { shouldSend: true, target: { to: 'foo@ok.com' } },
      sms: { shouldSend: true, target: { to: '1234567890' } },
    })
  })

  test('apply if conditionals', async ({ assert }) => {
    class NotifB extends Notification<any> {
      static override options: NotificationOptions<any> = {
        name: 'FakeNotification',
        deliverBy: {
          email: {
            if: ({ to }: any) => to.hasEmail,
          },
          sms: true,
        },
      }
    }

    const result = await new ChannelResolver().resolveChannels({
      to: {
        id: 'user-123',
        hasEmail: false,
        notificationTargets: () => ({ email: null, sms: '1212' }),
      } as any,
      notification: NotifB,
      params: {},
    })

    assert.deepEqual(result, {
      email: { shouldSend: false, target: null },
      sms: { shouldSend: true, target: '1212' },
    })
  })

  test('receive correct parameter in if callback', async ({ assert }) => {
    class NotifC extends Notification<any> {
      static override options: NotificationOptions<any> = {
        name: 'FakeNotification',
        deliverBy: {
          email: {
            if: ({ to, params }: any) => to.id === params.userId,
          },
        },
      }
    }

    const result = await new ChannelResolver().resolveChannels({
      to: { id: 'user-123' } as any,
      notification: NotifC,
      params: { userId: 'user-123' },
    })

    assert.deepEqual(result, {
      email: { shouldSend: true, target: null },
    })
  })
})

test.group('Channel resolver | preferences', () => {
  test('should apply global preferences', async ({ assert }) => {
    const db = new FakeDatabase({
      global: {
        global: {
          channels: { sms: false },
        },
        notifications: [],
      },
    })
    const result = await new ChannelResolver(db).resolveChannels({
      to: { id: 'user-123' } as any,
      notification: NotifA,
      params: {},
    })

    assert.deepEqual(result, {
      email: { shouldSend: true, target: null },
      sms: { shouldSend: false, target: null },
    })
  })

  test('should apply global notification specific preference', async ({ assert }) => {
    const db = new FakeDatabase({
      global: {
        global: { channels: { sms: false } },
        notifications: [
          {
            notification: { identifier: 'NotifA' },
            channels: { sms: true },
          },
        ],
      },
    })

    const result = await new ChannelResolver(db).resolveChannels({
      to: { id: 'user-123' } as any,
      notification: NotifA,
      params: {},
    })

    assert.deepEqual(result, {
      email: { shouldSend: true, target: null },
      sms: { shouldSend: true, target: null },
    })
  })

  test('should apply tenant preferences', async ({ assert }) => {
    const db = new FakeDatabase({
      global: {
        global: { channels: { sms: false } },
        notifications: [],
      },
      tenants: {
        'tenant-123': {
          global: { channels: { email: false } },
          notifications: [],
        },
      },
    })

    const result = await new ChannelResolver(db).resolveChannels({
      to: { id: 'user-123' } as any,
      notification: NotifA,
      params: {},
      tenantId: 'tenant-123',
    })

    assert.deepEqual(result, {
      email: { shouldSend: false, target: null },
      sms: { shouldSend: false, target: null },
    })
  })

  test('should apply tenant notification specific preferences', async ({ assert }) => {
    const db = new FakeDatabase({
      global: {
        global: { channels: { sms: false } },
        notifications: [],
      },
      tenants: {
        'tenant-123': {
          global: { channels: { email: false } },
          notifications: [
            {
              notification: { identifier: 'NotifA' },
              channels: { email: true, sms: true },
            },
          ],
        },
      },
    })

    const result = await new ChannelResolver(db).resolveChannels({
      to: { id: 'user-123' } as any,
      notification: NotifA,
      params: {},
      tenantId: 'tenant-123',
    })

    assert.deepEqual(result, {
      email: { shouldSend: true, target: null },
      sms: { shouldSend: true, target: null },
    })
  })

  test('should apply tenant preferences over global preferences', async ({ assert }) => {
    const db = new FakeDatabase({
      global: {
        global: { channels: { sms: false } },
        notifications: [],
      },
      tenants: {
        'tenant-123': {
          global: { channels: { sms: true } },
          notifications: [],
        },
      },
    })

    const result = await new ChannelResolver(db).resolveChannels({
      to: { id: 'user-123' } as any,
      notification: NotifA,
      params: {},
      tenantId: 'tenant-123',
    })

    assert.deepEqual(result, {
      email: { shouldSend: true, target: null },
      sms: { shouldSend: true, target: null },
    })
  })

  test('should apply tenant notification preferences over global notification preferences', async ({
    assert,
  }) => {
    const db = new FakeDatabase({
      global: {
        global: { channels: { sms: false } },
        notifications: [
          {
            notification: { identifier: 'NotifA' },
            channels: { sms: true },
          },
        ],
      },
      tenants: {
        'tenant-123': {
          global: { channels: { sms: true } },
          notifications: [
            {
              notification: { identifier: 'NotifA' },
              channels: { sms: false },
            },
          ],
        },
      },
    })

    const result = await new ChannelResolver(db).resolveChannels({
      to: { id: 'user-123' } as any,
      notification: NotifA,
      params: {},
      tenantId: 'tenant-123',
    })

    assert.deepEqual(result, {
      email: { shouldSend: true, target: null },
      sms: { shouldSend: false, target: null },
    })
  })
})

test.group('Channel resolver | critical notifications', () => {
  test('should bypass user preferences when notification is critical', async ({ assert }) => {
    const db = new FakeDatabase({
      global: {
        global: { channels: { email: false, sms: false } },
        notifications: [],
      },
    })

    const result = await new ChannelResolver(db).resolveChannels({
      to: { id: 'user-123' } as any,
      notification: CriticalNotif,
      params: {},
    })

    assert.deepEqual(result, {
      email: { shouldSend: true, target: null },
      sms: { shouldSend: true, target: null },
    })
  })

  test('should still respect deliverBy configuration for critical notifications', async ({
    assert,
  }) => {
    class CriticalWithDisabledChannel extends Notification<any> {
      static override options: NotificationOptions<any> = {
        name: 'CriticalWithDisabled',
        critical: true,
        deliverBy: { email: true, sms: false },
      }
    }

    const db = new FakeDatabase({
      global: {
        global: { channels: { email: true, sms: true } },
        notifications: [],
      },
    })

    const result = await new ChannelResolver(db).resolveChannels({
      to: { id: 'user-123' } as any,
      notification: CriticalWithDisabledChannel,
      params: {},
    })

    assert.deepEqual(result, {
      email: { shouldSend: true, target: null },
      sms: { shouldSend: false, target: null },
    })
  })
})

test.group('Channel resolver | category preferences', () => {
  test('should apply category preferences from default config', async ({ assert }) => {
    const defaultPreferences: ResolvedDefaultPreferences<any> = {
      enabled: true,
      global: { channels: { email: true, sms: true } },
      categories: {
        billing: { channels: { email: true, sms: false } },
      },
    }

    const result = await new ChannelResolver(undefined, defaultPreferences).resolveChannels({
      to: { id: 'user-123' } as any,
      notification: BillingNotif,
      params: {},
    })

    assert.deepEqual(result, {
      email: { shouldSend: true, target: null },
      sms: { shouldSend: false, target: null },
    })
  })

  test('should allow user preferences to override category preferences', async ({ assert }) => {
    const defaultPreferences: ResolvedDefaultPreferences<any> = {
      enabled: true,
      global: { channels: { email: true, sms: true } },
      categories: {
        billing: { channels: { email: true, sms: false } },
      },
    }

    const db = new FakeDatabase({
      global: {
        global: { channels: { sms: true } },
        notifications: [],
      },
    })

    const result = await new ChannelResolver(db, defaultPreferences).resolveChannels({
      to: { id: 'user-123' } as any,
      notification: BillingNotif,
      params: {},
    })

    assert.deepEqual(result, {
      email: { shouldSend: true, target: null },
      sms: { shouldSend: true, target: null },
    })
  })

  test('should apply category boolean (false = disable all channels)', async ({ assert }) => {
    const defaultPreferences: ResolvedDefaultPreferences<any> = {
      enabled: true,
      global: { channels: { email: true, sms: true } },
      categories: {
        billing: { channels: { email: false, sms: false } },
      },
    }

    const result = await new ChannelResolver(undefined, defaultPreferences).resolveChannels({
      to: { id: 'user-123' } as any,
      notification: BillingNotif,
      params: {},
    })

    assert.deepEqual(result, {
      email: { shouldSend: false, target: null },
      sms: { shouldSend: false, target: null },
    })
  })
})

test.group('Channel resolver | anonymous notifications', () => {
  test('should not crash when to is undefined', async ({ assert }) => {
    const result = await new ChannelResolver().resolveChannels({
      to: undefined,
      notification: NotifA,
      params: {},
    })

    assert.deepEqual(result, {
      email: { shouldSend: true, target: null },
      sms: { shouldSend: true, target: null },
    })
  })

  test('should use only deliverBy for anonymous notifications (no preferences lookup)', async ({
    assert,
  }) => {
    const db = new FakeDatabase({
      global: {
        global: { channels: { email: false, sms: false } },
        notifications: [],
      },
    })

    const result = await new ChannelResolver(db).resolveChannels({
      to: undefined,
      notification: NotifA,
      params: {},
    })

    assert.deepEqual(result, {
      email: { shouldSend: true, target: null },
      sms: { shouldSend: true, target: null },
    })
  })
})
