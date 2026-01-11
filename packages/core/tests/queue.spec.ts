import { test } from '@japa/runner'

import type { QueueAdapter, NotificationJobPayload, QueueItemOptions } from '../src/types/queue.ts'
import type { Notifiable } from '../src/types/notifications.ts'

import { testProvider, FakeNotification } from './helpers/index.ts'
import { Notification } from '../src/types/notifications.ts'
import { Facteur } from '../src/facteur.ts'

type TestUser = { id: string; email: string } & Notifiable

class QueuedNotification extends Notification<TestUser, { message: string }> {
  static override options = {
    name: 'QueuedNotification',
    tags: ['test'],
    queue: true,
    deliverBy: {
      email: true,
      sms: true,
    },
  }

  asEmailMessage() {
    return { subject: 'Test', body: this.params.message }
  }

  asSmsMessage() {
    return { body: this.params.message }
  }
}

class QueuedWithOptionsNotification extends Notification<TestUser, { message: string }> {
  static override options = {
    name: 'QueuedWithOptions',
    queue: { delay: '5m', queue: 'high-priority' },
    deliverBy: { email: true },
  }

  asEmailMessage() {
    return { subject: 'Test', body: this.params.message }
  }
}

function createMockQueueAdapter(): QueueAdapter & {
  getQueuedPayloads: () => Array<{ payload: NotificationJobPayload; options: QueueItemOptions | undefined }>
  clear: () => void
} {
  const queuedPayloads: Array<{ payload: NotificationJobPayload; options: QueueItemOptions | undefined }> = []

  return {
    async queue(payload: NotificationJobPayload, options?: QueueItemOptions) {
      queuedPayloads.push({ payload, options })
    },
    getQueuedPayloads() {
      return queuedPayloads
    },
    clear() {
      queuedPayloads.length = 0
    },
  }
}

test.group('Facteur | Queue', () => {
  test('queue notification via builder .queue() method', async ({ assert }) => {
    const provider = testProvider()
    const queueAdapter = createMockQueueAdapter()

    const facteur = new Facteur({
      channels: { email: provider, sms: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
      queueAdapter,
    })

    const user: TestUser = {
      id: '1',
      email: 'test@example.com',
      notificationTargets() {
        return { email: this.email, sms: '+1234567890' }
      },
    }

    const result = await facteur
      .notification(QueuedNotification)
      .to(user)
      .params({ message: 'Hello' })
      .queue()

    assert.equal(result.success, 2)
    assert.equal(result.failed, 0)

    const queued = queueAdapter.getQueuedPayloads()
    assert.equal(queued.length, 2)

    const channels = queued.map((q) => q.payload.channelName).sort()
    assert.deepEqual(channels, ['email', 'sms'])

    provider.assertNoneSent()
  })

  test('queue notification when class has queue: true option', async ({ assert }) => {
    const provider = testProvider()
    const queueAdapter = createMockQueueAdapter()

    const facteur = new Facteur({
      channels: { email: provider, sms: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
      queueAdapter,
    })

    const user: TestUser = {
      id: '1',
      email: 'test@example.com',
      notificationTargets() {
        return { email: this.email, sms: '+1234567890' }
      },
    }

    const result = await facteur.notification(QueuedNotification).to(user).params({ message: 'Hello' }).send()

    assert.equal(result.success, 2)
    const queued = queueAdapter.getQueuedPayloads()
    assert.equal(queued.length, 2)

    provider.assertNoneSent()
  })

  test('create one job per recipient x channel combination', async ({ assert }) => {
    const provider = testProvider()
    const queueAdapter = createMockQueueAdapter()

    const facteur = new Facteur({
      channels: { email: provider, sms: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
      queueAdapter,
    })

    const users: TestUser[] = [
      {
        id: '1',
        email: 'user1@example.com',
        notificationTargets() {
          return { email: this.email, sms: '+1111111111' }
        },
      },
      {
        id: '2',
        email: 'user2@example.com',
        notificationTargets() {
          return { email: this.email, sms: '+2222222222' }
        },
      },
      {
        id: '3',
        email: 'user3@example.com',
        notificationTargets() {
          return { email: this.email, sms: '+3333333333' }
        },
      },
    ]

    const result = await facteur.notification(QueuedNotification).to(users).params({ message: 'Hello everyone' }).queue()

    assert.equal(result.success, 6)
    const queued = queueAdapter.getQueuedPayloads()
    assert.equal(queued.length, 6)

    provider.assertNoneSent()
  })

  test('pass queue options from builder to adapter', async ({ assert }) => {
    const provider = testProvider()
    const queueAdapter = createMockQueueAdapter()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
      queueAdapter,
    })

    const user: TestUser = {
      id: '1',
      email: 'test@example.com',
      notificationTargets() {
        return { email: this.email }
      },
    }

    await facteur.notification(QueuedWithOptionsNotification).to(user).params({ message: 'Hello' }).queue({ delay: '10m', queue: 'urgent' })

    const queued = queueAdapter.getQueuedPayloads()
    assert.equal(queued.length, 1)
    assert.deepEqual(queued[0].options, { delay: '10m', queue: 'urgent' })
  })

  test('merge queue options from notification class and builder', async ({ assert }) => {
    const provider = testProvider()
    const queueAdapter = createMockQueueAdapter()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
      queueAdapter,
    })

    const user: TestUser = {
      id: '1',
      email: 'test@example.com',
      notificationTargets() {
        return { email: this.email }
      },
    }

    await facteur.notification(QueuedWithOptionsNotification).to(user).params({ message: 'Hello' }).queue({ delay: '1h' })

    const queued = queueAdapter.getQueuedPayloads()
    assert.equal(queued.length, 1)
    assert.deepEqual(queued[0].options, { delay: '1h', queue: 'high-priority' })
  })

  test('payload contains correct notification data', async ({ assert }) => {
    const provider = testProvider()
    const queueAdapter = createMockQueueAdapter()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
      queueAdapter,
    })

    const user: TestUser = {
      id: 'user-123',
      email: 'test@example.com',
      notificationTargets() {
        return { email: this.email }
      },
    }

    await facteur.notification(QueuedWithOptionsNotification).to(user).params({ message: 'Test message' }).tenant('tenant-1').queue()

    const queued = queueAdapter.getQueuedPayloads()
    assert.equal(queued.length, 1)

    const payload = queued[0].payload
    assert.equal(payload.notificationIdentifier, 'QueuedWithOptionsNotification')
    assert.deepEqual(payload.params, { message: 'Test message' })
    assert.equal(payload.channelName, 'email')
    assert.equal(payload.target, 'test@example.com')
    assert.equal(payload.tenantId, 'tenant-1')
    assert.equal(payload.recipientData.id, 'user-123')
    assert.equal(payload.recipientData.email, 'test@example.com')
  })

  test('respects shouldSend lifecycle hook when queueing', async ({ assert }) => {
    const provider = testProvider()
    const queueAdapter = createMockQueueAdapter()

    class ConditionalNotification extends Notification<TestUser, { skip: boolean }> {
      static override options = {
        name: 'ConditionalNotification',
        queue: true,
        deliverBy: { email: true },
      }

      override shouldSend() {
        return !this.params.skip
      }

      asEmailMessage() {
        return { subject: 'Test', body: 'Body' }
      }
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
      queueAdapter,
    })

    const user: TestUser = {
      id: '1',
      email: 'test@example.com',
      notificationTargets() {
        return { email: this.email }
      },
    }

    await facteur.notification(ConditionalNotification).to(user).params({ skip: true }).queue()

    const queued = queueAdapter.getQueuedPayloads()
    assert.equal(queued.length, 0)
  })

  test('send immediately when using .send() on non-queued notification', async ({ assert }) => {
    const provider = testProvider()
    const queueAdapter = createMockQueueAdapter()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
      queueAdapter,
    })

    await facteur.notification(FakeNotification).via({ email: { to: 'test@example.com' } }).send()

    provider.assertSentCount(1)
    assert.equal(queueAdapter.getQueuedPayloads().length, 0)
  })
})
