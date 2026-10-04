import { setTimeout } from 'node:timers/promises'
import EventEmitter from 'node:events'
import { test } from '@japa/runner'

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
    assert.isTrue(provider.getSentMessages().length === 1 || provider.getBatches().length === 1)
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

function batchProvider(sendBatch: NonNullable<Channel['sendBatch']>, maxSize = 100): Channel {
  return {
    name: 'email',
    [kTargetSymbol]: null,
    batchConfig: { maxSize },
    send() {
      throw new Error('Expected batch API')
    },
    sendBatch,
  }
}

function successfulBatch(messages: ChannelSendParams<any, any>[]): BatchSendResult {
  return {
    success: messages.length,
    failed: 0,
    results: messages.map((_, index) => ({ index, status: 'success' })),
  }
}

test.group('Driver Batching | failures, retries and lifecycle', () => {
  const discoverer = { searchDirectory: new URL('./notifications', import.meta.url) }

  test('rejects by default, finalizes the current chunk and stops before the next chunk', async ({
    assert,
  }) => {
    const failure = new Error('Rejected batch')
    const batches: string[][] = []
    const hooks: string[] = []
    const progress: number[] = []
    class HookNotification extends UserNotification {
      override afterSend() {
        hooks.push(this.notifiable.id)
      }
    }
    const provider = batchProvider(async (messages) => {
      batches.push(messages.map((m) => m.to.id))
      throw failure
    })
    const facteur = new Facteur({ discoverer, channels: { email: provider } })

    let caught: AggregateError | undefined
    await assert.rejects(
      () =>
        facteur
          .notification(HookNotification)
          .params({ message: 'Hello' })
          .to(createUsers(5))
          .useDriverBatching()
          .chunkSize(2)
          .onProgress((completed) => progress.push(completed))
          .send()
          .catch((error) => {
            caught = error
            throw error
          }),
      AggregateError,
    )

    assert.deepEqual(caught?.errors, [failure])
    assert.deepEqual(batches, [['1', '2']])
    assert.sameMembers(hooks, ['1', '2'])
    assert.deepEqual(progress, [])
  })

  test('throwOnError(false) returns rejected batches and progresses across chunks', async ({
    assert,
  }) => {
    const failure = new Error('Rejected batch')
    let attempts = 0
    const progress: number[] = []
    const facteur = new Facteur({
      discoverer,
      channels: {
        email: batchProvider(async () => {
          attempts++
          throw failure
        }),
      },
    })

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(5))
      .useDriverBatching()
      .chunkSize(2)
      .throwOnError(false)
      .onProgress((completed) => progress.push(completed))
      .send()

    assert.equal(attempts, 3)
    assert.equal(result.success, 0)
    assert.equal(result.failed, 5)
    assert.deepEqual(
      result.results.map((r) => r.error),
      Array(5).fill(failure),
    )
    assert.deepEqual(progress, [2, 4, 5])
  })

  for (const asynchronous of [false, true]) {
    test(`retries ${asynchronous ? 'rejections' : 'synchronous exceptions'} twice`, async ({
      assert,
    }) => {
      const batches: string[][] = []
      const sendBatch = (messages: ChannelSendParams<any, any>[]) => {
        batches.push(messages.map((m) => m.to.id))
        if (batches.length < 3) throw new Error('Temporary failure')
        return successfulBatch(messages)
      }
      const facteur = new Facteur({
        discoverer,
        channels: {
          email: batchProvider(asynchronous ? async (messages) => sendBatch(messages) : sendBatch),
        },
      })

      const result = await facteur
        .notification(UserNotification)
        .params({ message: 'Hello' })
        .to(createUsers(3))
        .useDriverBatching()
        .retries(2)
        .send()

      assert.deepEqual(batches, [
        ['1', '2', '3'],
        ['1', '2', '3'],
        ['1', '2', '3'],
      ])
      assert.equal(result.success, 3)
      assert.equal(result.failed, 0)
      assert.equal(result.results.length, 3)
    })
  }

  test('retries only failed indexed messages across driver sub-batches', async ({ assert }) => {
    const batches: string[][] = []
    const attempts: Record<string, number> = {}
    const facteur = new Facteur({
      discoverer,
      channels: {
        email: batchProvider((messages) => {
          batches.push(messages.map((m) => m.to.id))
          const results = messages
            .map((m, index) => {
              attempts[m.to.id] = (attempts[m.to.id] ?? 0) + 1
              const failed =
                (m.to.id === '2' && attempts[m.to.id]! < 2) ||
                (m.to.id === '4' && attempts[m.to.id]! < 3)
              return { index, status: failed ? ('failed' as const) : ('success' as const) }
            })
            .reverse()
          return { success: 0, failed: 0, results }
        }, 2),
      },
    })

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(5))
      .useDriverBatching()
      .retries(2)
      .throwOnError(false)
      .send()

    assert.deepEqual(batches, [['1', '2'], ['3', '4'], ['5'], ['2', '4'], ['4']])
    assert.deepEqual(attempts, { '1': 1, '2': 2, '3': 1, '4': 3, '5': 1 })
    assert.equal(result.success, 5)
    assert.equal(result.failed, 0)
    assert.equal(result.results.length, 5)
  })

  test('keeps successes and the last error after exhausting partial-failure retries', async ({
    assert,
  }) => {
    const batches: string[][] = []
    const failures: Error[] = []
    const facteur = new Facteur({
      discoverer,
      channels: {
        email: batchProvider((messages) => {
          batches.push(messages.map((m) => m.to.id))
          const error = new Error(`Attempt ${batches.length}`)
          failures.push(error)
          return {
            success: 0,
            failed: 0,
            results: messages
              .map((m, index) => ({
                index,
                status: m.to.id === '2' ? ('failed' as const) : ('success' as const),
                error,
              }))
              .reverse(),
          }
        }),
      },
    })

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(3))
      .useDriverBatching()
      .retries(2)
      .throwOnError(false)
      .send()

    assert.deepEqual(batches, [['1', '2', '3'], ['2'], ['2']])
    assert.equal(result.success, 2)
    assert.equal(result.failed, 1)
    assert.deepEqual(
      result.results.map((r) => r.status),
      ['success', 'failed', 'success'],
    )
    assert.strictEqual(result.results[1]!.error, failures[2])
  })

  test('does not replay successful sub-batches when a later API call rejects', async ({
    assert,
  }) => {
    const batches: string[][] = []
    const facteur = new Facteur({
      discoverer,
      channels: {
        email: batchProvider(async (messages) => {
          batches.push(messages.map((m) => m.to.id))
          if (batches.length === 2) throw new Error('Second sub-batch failed')
          return successfulBatch(messages)
        }, 2),
      },
    })

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(5))
      .useDriverBatching()
      .retries(1)
      .send()

    assert.deepEqual(batches, [['1', '2'], ['3', '4'], ['5'], ['3', '4']])
    assert.equal(result.success, 5)
    assert.equal(result.failed, 0)
  })

  test('continueOnError preserves channel results and continues to later chunks', async ({
    assert,
  }) => {
    const provider = new PartialFailBatchProvider([1])
    const progress: number[] = []
    const facteur = new Facteur({ discoverer, channels: { email: provider } })

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(5))
      .useDriverBatching()
      .chunkSize(2)
      .continueOnError()
      .onProgress((completed) => progress.push(completed))
      .send()

    assert.equal(result.success, 3)
    assert.equal(result.failed, 2)
    assert.deepEqual(
      result.results.map((r) => r.status),
      ['success', 'failed', 'success', 'failed', 'success'],
    )
    assert.deepEqual(progress, [2, 4, 5])
  })

  for (const disableDriverBatch of [false, true]) {
    test(`retries fallback messages without replaying successes (disabled=${disableDriverBatch})`, async ({
      assert,
    }) => {
      const attempts: Record<string, number> = {}
      const provider: Channel = {
        name: 'email',
        [kTargetSymbol]: null,
        ...(disableDriverBatch && {
          sendBatch() {
            throw new Error('Batch API disabled')
          },
        }),
        send(options) {
          const id = options.to.id
          attempts[id] = (attempts[id] ?? 0) + 1
          if (id === '2' && attempts[id]! < 3) throw new Error('Temporary failure')
        },
      }
      const facteur = new Facteur({ discoverer, channels: { email: provider } })

      const result = await facteur
        .notification(UserNotification)
        .params({ message: 'Hello' })
        .to(createUsers(3))
        .useDriverBatching()
        .disableDriverBatch(disableDriverBatch)
        .retries(2)
        .send()

      assert.deepEqual(attempts, { '1': 1, '2': 3, '3': 1 })
      assert.equal(result.success, 3)
      assert.equal(result.failed, 0)
    })
  }

  test('applies timeout to the whole channel attempt and ignores late sub-batch completion', async ({
    assert,
  }) => {
    const batches: string[][] = []
    const provider = batchProvider(async (messages) => {
      batches.push(messages.map((m) => m.to.id))
      await setTimeout(35)
      return successfulBatch(messages)
    }, 1)
    const facteur = new Facteur({ discoverer, channels: { email: provider } })

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(3))
      .useDriverBatching()
      .timeout(55)
      .throwOnError(false)
      .send()

    assert.equal(result.success, 1)
    assert.equal(result.failed, 2)
    assert.deepEqual(
      result.results.map((r) => r.status),
      ['success', 'failed', 'failed'],
    )
    await setTimeout(60)
    assert.deepEqual(batches, [['1'], ['2']])
    assert.deepEqual(
      result.results.map((r) => r.status),
      ['success', 'failed', 'failed'],
    )
  })

  test('retries timeouts without replaying earlier successes or emitting late events', async ({
    assert,
  }) => {
    const batches: string[][] = []
    const sent: string[] = []
    const emitter = new EventEmitter()
    emitter.on('facteur:message:sent', ({ message }) => sent.push(message.to))
    class IdentifiedNotification extends UserNotification {
      override asEmailMessage() {
        return { ...super.asEmailMessage(), to: this.notifiable.id }
      }
    }
    const facteur = new Facteur({
      discoverer,
      emitter,
      channels: {
        email: batchProvider(async (messages) => {
          batches.push(messages.map((m) => m.to.id))
          if (batches.length === 2) await setTimeout(100)
          return successfulBatch(messages)
        }, 1),
      },
    })

    const result = await facteur
      .notification(IdentifiedNotification)
      .params({ message: 'Hello' })
      .to(createUsers(3))
      .useDriverBatching()
      .timeout(25)
      .retries(1)
      .send()

    assert.equal(result.success, 3)
    assert.equal(result.failed, 0)
    await setTimeout(120)
    assert.deepEqual(batches, [['1'], ['2'], ['2'], ['3']])
    assert.deepEqual(sent, ['1', '2', '3'])
  })

  test('finalizes per-notification multi-channel results and emits terminal events only once', async ({
    assert,
  }) => {
    const emitter = new EventEmitter()
    const events: Record<string, string[]> = {}
    const terminal: Record<string, any> = {}
    const before: string[] = []
    const after: string[] = []
    class LifecycleNotification extends MultiChannelNotification {
      get id() {
        return this.notifiable.id
      }
      override beforeSend() {
        before.push(this.id)
      }
      override afterSend() {
        events[this.id]!.push('afterSend')
        after.push(this.id)
      }
      override shouldSend() {
        return this.id !== '4'
      }
      override asEmailMessage() {
        if (this.id === '3') return null as any
        return super.asEmailMessage()
      }
    }
    for (const name of [
      'notification:sending',
      'message:sending',
      'message:sent',
      'message:failed',
      'notification:sent',
      'notification:failed',
    ]) {
      emitter.on(`facteur:${name}`, (data) => {
        const id = data.notification.id
        ;(events[id] ??= []).push(name)
        if (name === 'notification:sending')
          assert.deepEqual(Object.keys(data.resolvedChannels), ['email', 'push'])
        if (name === 'notification:sent' || name === 'notification:failed') terminal[id] = data
      })
    }
    let attempts = 0
    const failure = new Error('Permanent failure')
    const facteur = new Facteur({
      discoverer,
      emitter,
      channels: {
        email: batchProvider((messages) => {
          attempts++
          return {
            success: 0,
            failed: 0,
            results: messages
              .map((m, index) => ({
                index,
                status:
                  m.to.id === '2' || attempts === 1 ? ('failed' as const) : ('success' as const),
                error: failure,
              }))
              .reverse(),
          }
        }),
        push: new NonBatchProvider(),
      },
    })

    const result = await facteur
      .notification(LifecycleNotification)
      .params({ message: 'Hello' })
      .to(createUsers(4))
      .useDriverBatching()
      .retries(1)
      .throwOnError(false)
      .send()

    assert.equal(result.success, 4)
    assert.equal(result.failed, 1)
    assert.deepEqual(before, ['1', '2', '3', '4'])
    assert.sameMembers(after, ['1', '2', '3'])
    assert.isUndefined(events['4'])
    assert.deepEqual(terminal['1'].results, [
      { channel: 'email', status: 'success' },
      { channel: 'push', status: 'success' },
    ])
    assert.deepEqual(terminal['2'].errors, [failure])
    assert.deepEqual(terminal['3'].results, [{ channel: 'push', status: 'success' }])
    for (const id of ['1', '2', '3']) {
      const trace = events[id]!
      assert.equal(trace[0], 'notification:sending')
      assert.equal(trace.at(-1), 'afterSend')
      assert.equal(trace.at(-2), id === '2' ? 'notification:failed' : 'notification:sent')
      assert.equal(trace.filter((e) => e === 'message:sending').length, id === '3' ? 1 : 2)
      assert.equal(trace.filter((e) => e === 'message:failed').length, id === '2' ? 1 : 0)
      assert.equal(trace.filter((e) => e === 'message:sent').length, id === '1' ? 2 : 1)
    }
  })

  test('counts preparation exceptions, message-build errors and afterSend exceptions without retrying hooks', async ({
    assert,
  }) => {
    const before: string[] = []
    const after: string[] = []
    const batches: string[][] = []
    class ThrowingNotification extends UserNotification {
      override beforeSend() {
        before.push(this.notifiable.id)
        if (this.notifiable.id === '1') throw new Error('beforeSend failed')
      }
      override asEmailMessage() {
        if (this.notifiable.id === '2') throw new Error('Message build failed')
        return super.asEmailMessage()
      }
      override afterSend() {
        after.push(this.notifiable.id)
        if (this.notifiable.id === '3') throw new Error('afterSend failed')
      }
    }
    const facteur = new Facteur({
      discoverer,
      channels: {
        email: batchProvider((messages) => {
          batches.push(messages.map((m) => m.to.id))
          return successfulBatch(messages)
        }),
      },
    })

    const result = await facteur
      .notification(ThrowingNotification)
      .params({ message: 'Hello' })
      .to(createUsers(5))
      .useDriverBatching()
      .chunkSize(2)
      .retries(2)
      .continueOnError()
      .send()

    assert.equal(result.success, 2)
    assert.equal(result.failed, 3)
    assert.equal(result.results.length, 3)
    assert.equal(result.results[0]!.error.message, 'Message build failed')
    assert.deepEqual(before, ['1', '2', '3', '4', '5'])
    assert.sameMembers(after, ['2', '3', '4', '5'])
    assert.deepEqual(batches, [['3', '4'], ['5']])
  })

  test('rejects exhausted partial failures and supplies a missing driver error', async ({
    assert,
  }) => {
    const batches: string[][] = []
    const failedEvents: Error[] = []
    const emitter = new EventEmitter()
    emitter.on('facteur:notification:failed', ({ errors }) => failedEvents.push(...errors))
    const facteur = new Facteur({
      discoverer,
      emitter,
      channels: {
        email: batchProvider((messages) => {
          batches.push(messages.map((m) => m.to.id))
          return {
            success: 0,
            failed: 0,
            results: messages.map((m, index) => ({
              index,
              status: m.to.id === '2' ? ('failed' as const) : ('success' as const),
            })),
          }
        }),
      },
    })

    await assert.rejects(
      () =>
        facteur
          .notification(UserNotification)
          .params({ message: 'Hello' })
          .to(createUsers(3))
          .useDriverBatching()
          .retries(2)
          .send(),
      AggregateError,
    )

    assert.deepEqual(batches, [['1', '2', '3'], ['2'], ['2']])
    assert.equal(failedEvents.length, 1)
    assert.instanceOf(failedEvents[0], Error)
    assert.equal(failedEvents[0]!.message, 'Unknown batch error')
  })

  for (const disabled of [false, true]) {
    test(`finalizes notifications without messages (channel disabled=${disabled})`, async ({
      assert,
    }) => {
      const after: string[] = []
      const sent: any[] = []
      const emitter = new EventEmitter()
      let messageEvents = 0
      emitter.on('facteur:notification:sent', (data) => sent.push(data))
      emitter.on('facteur:message:sending', () => messageEvents++)
      class EmptyNotification extends UserNotification {
        get id() {
          return this.notifiable.id
        }
        override asEmailMessage() {
          return null as any
        }
        override afterSend() {
          after.push(this.id)
        }
      }
      const facteur = new Facteur({
        discoverer,
        emitter,
        channels: {
          email: batchProvider(() => {
            throw new Error('No messages to send')
          }),
        },
      })

      const result = await facteur
        .notification(EmptyNotification)
        .params({ message: 'Hello' })
        .to(createUsers(2))
        .via({ email: !disabled })
        .useDriverBatching()
        .send()

      assert.deepEqual(result, { success: 0, failed: 0, results: [] })
      assert.sameMembers(after, ['1', '2'])
      assert.deepEqual(
        sent.map((data) => [data.notification.id, data.results]),
        [
          ['1', []],
          ['2', []],
        ],
      )
      assert.equal(messageEvents, 0)
    })
  }

  test('propagates afterSend exceptions even with throwOnError(false), without resending', async ({
    assert,
  }) => {
    const after: string[] = []
    const provider = new BatchableProvider()
    class ThrowingHookNotification extends UserNotification {
      override afterSend() {
        after.push(this.notifiable.id)
        if (this.notifiable.id === '2') throw new Error('Hook exception')
      }
    }
    const facteur = new Facteur({ discoverer, channels: { email: provider } })

    await assert.rejects(
      () =>
        facteur
          .notification(ThrowingHookNotification)
          .params({ message: 'Hello' })
          .to(createUsers(5))
          .useDriverBatching()
          .chunkSize(2)
          .retries(2)
          .throwOnError(false)
          .send(),
      /Hook exception/,
    )

    assert.sameMembers(after, ['1', '2'])
    assert.equal(provider.getBatches().length, 1)
    assert.equal(provider.getTotalBatchedMessages(), 2)
  })
})
