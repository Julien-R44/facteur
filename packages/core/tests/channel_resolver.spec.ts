import { test } from '@japa/runner'
import { ChannelResolver } from '../src/notifications/channel_resolver.js'
import { Notification, type NotificationOptions } from '../src/types/index.js'
import { FakeDatabase } from './helpers/index.js'

class NotifA extends Notification<any> {
  static override options: NotificationOptions<any> = {
    name: 'FakeNotification',
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
