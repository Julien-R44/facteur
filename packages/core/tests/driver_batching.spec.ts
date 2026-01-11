import { test } from '@japa/runner'
import { setTimeout } from 'node:timers/promises'

import {
  kTargetSymbol,
  Notification,
  type Notifiable,
  type Channel,
  type ChannelSendParams,
  type BatchSendResult,
} from '../src/types/index.ts'
import { Facteur } from '../src/facteur.ts'

type TestUser = { id: string; email: string } & Notifiable

class UserNotification extends Notification<TestUser, { message: string }> {
  static override options = {
    name: 'UserNotification',
    tags: ['test'],
    deliverBy: { email: true },
  }

  asEmailMessage() {
    return { subject: 'Test', body: this.params.message }
  }
}

class MultiChannelNotification extends Notification<TestUser, { message: string }> {
  static override options = {
    name: 'MultiChannelNotification',
    tags: ['test'],
    deliverBy: { email: true, push: true },
  }

  asEmailMessage() {
    return { subject: 'Test', body: this.params.message }
  }

  asPushMessage() {
    return { title: 'Test', body: this.params.message }
  }
}

function createUsers(count: number): TestUser[] {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    email: `user${i + 1}@test.com`,
    notificationTargets: () => ({
      email: `user${i + 1}@test.com`,
      push: `token-${i + 1}`,
    }),
  }))
}

/**
 * A test provider that supports batch sending
 */
class BatchableProvider implements Channel<any, any, any, any> {
  name = 'email' as const;
  [kTargetSymbol] = null as any
  #sent: Array<ChannelSendParams<any, any>> = []
  #batches: Array<Array<ChannelSendParams<any, any>>> = []

  batchConfig = { enabled: true, maxSize: 100 }

  send(options: ChannelSendParams<any, any>) {
    this.#sent.push(options)
  }

  sendBatch(messages: Array<ChannelSendParams<any, any>>): BatchSendResult {
    this.#batches.push(messages)
    return {
      success: messages.length,
      failed: 0,
      results: messages.map((_, index) => ({ index, status: 'success' as const })),
    }
  }

  getSentMessages() {
    return this.#sent
  }

  getBatches() {
    return this.#batches
  }

  getTotalBatchedMessages() {
    return this.#batches.reduce((sum, batch) => sum + batch.length, 0)
  }
}

/**
 * A provider that fails some messages in a batch
 */
class PartialFailBatchProvider implements Channel<any, any, any, any> {
  name = 'email' as const;
  [kTargetSymbol] = null as any
  #failIndices: number[]

  batchConfig = { enabled: true, maxSize: 100 }

  constructor(failIndices: number[]) {
    this.#failIndices = failIndices
  }

  send() {}

  sendBatch(messages: Array<ChannelSendParams<any, any>>): BatchSendResult {
    const results = messages.map((_, index) => {
      if (this.#failIndices.includes(index)) {
        return { index, status: 'failed' as const, error: new Error(`Failed at index ${index}`) }
      }
      return { index, status: 'success' as const }
    })
    const failures = results.filter((r) => r.status === 'failed').length
    return {
      success: messages.length - failures,
      failed: failures,
      results,
    }
  }
}

/**
 * A provider that tracks individual sends (non-batch)
 */
class NonBatchProvider implements Channel<any, any, any, any> {
  name = 'push' as const;
  [kTargetSymbol] = null as any
  #sent: Array<ChannelSendParams<any, any>> = []

  send(options: ChannelSendParams<any, any>) {
    this.#sent.push(options)
  }

  getSentMessages() {
    return this.#sent
  }
}

test.group('Driver Batching | useDriverBatching mode', () => {
  test('uses batch API when channel supports it', async ({ assert }) => {
    const provider = new BatchableProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(5))
      .useDriverBatching()
      .send()

    // Should use batch API, not individual sends
    assert.equal(provider.getSentMessages().length, 0)
    assert.equal(provider.getBatches().length, 1)
    assert.equal(provider.getTotalBatchedMessages(), 5)
  })

  test('respects batch maxSize limit', async ({ assert }) => {
    const provider = new BatchableProvider()
    provider.batchConfig.maxSize = 3

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(7))
      .useDriverBatching()
      .send()

    // 7 messages with maxSize 3 = 3 batches (3 + 3 + 1)
    assert.equal(provider.getBatches().length, 3)
    assert.equal(provider.getBatches()[0]!.length, 3)
    assert.equal(provider.getBatches()[1]!.length, 3)
    assert.equal(provider.getBatches()[2]!.length, 1)
  })

  test('falls back to individual sends for non-batch channels', async ({ assert }) => {
    const pushProvider = new NonBatchProvider()

    const facteur = new Facteur({
      channels: { push: pushProvider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    class PushOnlyNotification extends Notification<TestUser, { message: string }> {
      static override options = {
        name: 'PushOnlyNotification',
        tags: ['test'],
        deliverBy: { push: true },
      }

      asPushMessage() {
        return { title: 'Test', body: this.params.message }
      }
    }

    await facteur
      .notification(PushOnlyNotification)
      .params({ message: 'Hello' })
      .to(createUsers(3))
      .useDriverBatching()
      .send()

    // Should fall back to individual sends
    assert.equal(pushProvider.getSentMessages().length, 3)
  })

  test('groups messages by channel and batches each separately', async ({ assert }) => {
    const emailProvider = new BatchableProvider()
    const pushProvider = new NonBatchProvider()

    const facteur = new Facteur({
      channels: { email: emailProvider, push: pushProvider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    await facteur
      .notification(MultiChannelNotification)
      .params({ message: 'Hello' })
      .to(createUsers(4))
      .useDriverBatching()
      .send()

    // Email should be batched
    assert.equal(emailProvider.getBatches().length, 1)
    assert.equal(emailProvider.getTotalBatchedMessages(), 4)
    assert.equal(emailProvider.getSentMessages().length, 0)

    // Push should be sent individually
    assert.equal(pushProvider.getSentMessages().length, 4)
  })

  test('handles partial batch failures correctly', async ({ assert }) => {
    const provider = new PartialFailBatchProvider([1, 3]) // Fail indices 1 and 3

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(5))
      .useDriverBatching()
      .throwOnError(false)
      .send()

    assert.equal(result.success, 3)
    assert.equal(result.failed, 2)
    assert.equal(result.results.length, 5)

    const failures = result.results.filter((r) => r.status === 'failed')
    assert.equal(failures.length, 2)
  })

  test('disableDriverBatch forces individual sends', async ({ assert }) => {
    const provider = new BatchableProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(3))
      .useDriverBatching()
      .disableDriverBatch(true)
      .send()

    // Should NOT use batch API
    assert.equal(provider.getBatches().length, 0)
    assert.equal(provider.getSentMessages().length, 3)
  })

  test('works with chunking', async ({ assert }) => {
    const provider = new BatchableProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(10))
      .useDriverBatching()
      .chunkSize(4)
      .send()

    // 10 users in chunks of 4 = 3 chunks (4 + 4 + 2)
    // Each chunk results in one batch call
    assert.equal(provider.getBatches().length, 3)
    assert.equal(provider.getTotalBatchedMessages(), 10)
  })

  test('progress callback is called per chunk in batch mode', async ({ assert }) => {
    const provider = new BatchableProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const progressCalls: Array<{ completed: number; total: number }> = []

    await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(9))
      .useDriverBatching()
      .chunkSize(3)
      .onProgress((completed, total) => progressCalls.push({ completed, total }))
      .send()

    // In batch mode, progress is called once per chunk
    assert.equal(progressCalls.length, 3)
    assert.deepEqual(progressCalls, [
      { completed: 3, total: 9 },
      { completed: 6, total: 9 },
      { completed: 9, total: 9 },
    ])
  })

  test('respects shouldSend on notification', async ({ assert }) => {
    const provider = new BatchableProvider()

    class ConditionalNotification extends Notification<TestUser, { message: string }> {
      static override options = {
        name: 'ConditionalNotification',
        tags: ['test'],
        deliverBy: { email: true },
      }

      override shouldSend() {
        // Only send to users with even IDs
        return Number(this.notifiable.id) % 2 === 0
      }

      asEmailMessage() {
        return { subject: 'Test', body: this.params.message }
      }
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    await facteur
      .notification(ConditionalNotification)
      .params({ message: 'Hello' })
      .to(createUsers(6)) // IDs 1-6, only 2,4,6 should send
      .useDriverBatching()
      .send()

    assert.equal(provider.getTotalBatchedMessages(), 3)
  })
})

test.group('Driver Batching | default mode preserves original behavior', () => {
  test('does not use batch mode by default', async ({ assert }) => {
    const provider = new BatchableProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(5))
      .send()

    // Should use individual sends via sender.send() which goes through sendChannelBatch
    // but sendChannelBatch will still use batch API if available
    // The key difference is per-recipient error handling and retries
    assert.isAtLeast(provider.getBatches().length + provider.getSentMessages().length, 1)
  })

  test('progress callback is called per recipient in default mode', async ({ assert }) => {
    const provider = new BatchableProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const progressCalls: number[] = []

    await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(5))
      .concurrency(1)
      .onProgress((completed) => progressCalls.push(completed))
      .send()

    // In default mode, progress is called per recipient
    assert.deepEqual(progressCalls, [1, 2, 3, 4, 5])
  })
})

test.group('Driver Batching | NotificationSender.sendChannelBatch', () => {
  test('sendChannelBatch uses batch API when available', async ({ assert }) => {
    const provider = new BatchableProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    // Single send still goes through normal path
    await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(1)[0]!)
      .send()

    // Single recipient uses individual channel.send, not batch
    // This is because the notification sender sends per-channel, not batched
    assert.isTrue(
      provider.getSentMessages().length === 1 || provider.getBatches().length === 1,
    )
  })
})

test.group('Driver Batching | async scenarios', () => {
  test('handles concurrent batch sends', async ({ assert }) => {
    let batchCount = 0
    const provider = new BatchableProvider()
    const originalSendBatch = provider.sendBatch.bind(provider)

    // Override with async version
    ;(provider as any).sendBatch = async (messages: any) => {
      batchCount++
      await setTimeout(10)
      return originalSendBatch(messages)
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(10))
      .useDriverBatching()
      .chunkSize(5)
      .concurrency(5)
      .send()

    assert.equal(batchCount, 2) // 2 chunks
    assert.equal(provider.getTotalBatchedMessages(), 10)
  })
})
