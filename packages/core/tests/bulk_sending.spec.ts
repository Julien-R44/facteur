import { test } from '@japa/runner'
import { setTimeout } from 'node:timers/promises'

import { testProvider } from './helpers/index.ts'
import { Notification, type Notifiable } from '../src/types/notifications.ts'
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

class AnonymousNotification extends Notification<undefined, { message: string }> {
  static override options = { name: 'AnonymousNotification', deliverBy: { email: true } }

  asEmailMessage() {
    return { subject: 'Test', body: this.params.message }
  }
}

function createUsers(count: number): TestUser[] {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    email: `user${i + 1}@test.com`,
    notificationTargets: () => ({ email: `user${i + 1}@test.com` }),
  }))
}

test.group('Bulk Sending | concurrency', () => {
  test('respects concurrency limit', async ({ assert }) => {
    const provider = testProvider()
    let maxConcurrent = 0
    let currentConcurrent = 0

    const originalSend = provider.send.bind(provider)
    provider.send = async (options: any) => {
      currentConcurrent++
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent)
      await setTimeout(10)
      currentConcurrent--
      return originalSend(options)
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(20))
      .concurrency(3)
      .send()

    assert.equal(provider.getSentMessages().length, 20)
    assert.isAtMost(maxConcurrent, 3)
  })

  test('uses default concurrency of 10', async ({ assert }) => {
    const provider = testProvider()
    let maxConcurrent = 0
    let currentConcurrent = 0

    const originalSend = provider.send.bind(provider)
    provider.send = async (options: any) => {
      currentConcurrent++
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent)
      await setTimeout(5)
      currentConcurrent--
      return originalSend(options)
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(30))
      .send()

    assert.equal(provider.getSentMessages().length, 30)
    assert.isAtMost(maxConcurrent, 10)
  })
})

test.group('Bulk Sending | chunking', () => {
  test('processes recipients in chunks', async ({ assert }) => {
    const provider = testProvider()
    const processedBatches: number[] = []
    let batchCount = 0

    const originalSend = provider.send.bind(provider)
    provider.send = (options: any) => {
      batchCount++
      if (batchCount % 5 === 0) processedBatches.push(batchCount)
      return originalSend(options)
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(15))
      .chunkSize(5)
      .concurrency(5)
      .send()

    assert.equal(provider.getSentMessages().length, 15)
  })

  test('handles chunk size larger than recipient count', async ({ assert }) => {
    const provider = testProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(5))
      .chunkSize(100)
      .send()

    assert.equal(provider.getSentMessages().length, 5)
  })
})

test.group('Bulk Sending | continueOnError', () => {
  test('stops on first error when continueOnError is false', async ({ assert }) => {
    const provider = testProvider()
    let callCount = 0

    provider.send = () => {
      callCount++
      if (callCount === 3) throw new Error('Test error')
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    await assert.rejects(() =>
      facteur
        .notification(UserNotification)
        .params({ message: 'Hello' })
        .to(createUsers(10))
        .concurrency(1)
        .continueOnError(false)
        .send(),
    )

    assert.isAtMost(callCount, 10)
  })

  test('continues sending when continueOnError is true', async ({ assert }) => {
    const provider = testProvider()
    let callCount = 0

    const originalSend = provider.send.bind(provider)
    provider.send = (options: any) => {
      callCount++
      if (callCount === 3 || callCount === 7) throw new Error('Test error')
      return originalSend(options)
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(10))
      .concurrency(1)
      .continueOnError(true)
      .send()

    assert.equal(callCount, 10)
    assert.equal(result.success, 8)
    assert.equal(result.failed, 2)
  })
})

test.group('Bulk Sending | continueOnError results', () => {
  const alice = {
    id: '1',
    email: 'alice@test.com',
    notificationTargets: () => ({ email: 'alice@test.com' }),
  }
  const bob = {
    id: '2',
    email: 'bob@test.com',
    notificationTargets: () => ({ email: 'bob@test.com' }),
  }

  function createFacteur() {
    const provider = testProvider()
    const originalSend = provider.send.bind(provider)
    provider.send = (options: any) => {
      if (JSON.stringify(options.targets).includes('alice@')) throw new Error('alice is down')
      return originalSend(options)
    }

    return new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })
  }

  const cases = [
    {
      title: 'one recipient',
      expectedSuccess: 0,
      send: (facteur: Facteur<any>, throwOnError = false) => {
        const builder = facteur
          .notification(UserNotification)
          .params({ message: 'Hello' })
          .to([alice])
          .continueOnError(true)
        return (throwOnError ? builder.throwOnError(true) : builder).send()
      },
    },
    {
      title: 'two recipients',
      expectedSuccess: 1,
      send: (facteur: Facteur<any>, throwOnError = false) => {
        const builder = facteur
          .notification(UserNotification)
          .params({ message: 'Hello' })
          .to([alice, bob])
          .continueOnError(true)
        return (throwOnError ? builder.throwOnError(true) : builder).send()
      },
    },
    {
      title: 'an anonymous send',
      expectedSuccess: 0,
      send: (facteur: Facteur<any>, throwOnError = false) => {
        const builder = facteur
          .notification(AnonymousNotification)
          .params({ message: 'Hello' })
          .via({ email: { to: 'alice@test.com' } })
          .continueOnError(true)
        return (throwOnError ? builder.throwOnError(true) : builder).send()
      },
    },
  ]

  test('resolves with the failing channel result for {title}')
    .with(cases)
    .run(async ({ assert }, { send, expectedSuccess }) => {
      const result = await send(createFacteur())

      assert.equal(result.success, expectedSuccess)
      assert.equal(result.failed, 1)

      const failures = result.results.filter((r) => r.status === 'failed')
      assert.lengthOf(failures, 1)
      assert.equal(failures[0]!.channel, 'email')
      assert.equal(failures[0]!.error.message, 'alice is down')
    })

  test('explicit throwOnError(true) still rejects for {title}')
    .with(cases)
    .run(async ({ assert }, { send }) => {
      await assert.rejects(
        () => send(createFacteur(), true),
        'Failed to send notification due to errors in one or more channels.',
      )
    })

  test('explicit throwOnError(true) still rejects with driver batching', async ({ assert }) => {
    await assert.rejects(
      () =>
        createFacteur()
          .notification(UserNotification)
          .params({ message: 'Hello' })
          .to([alice, bob])
          .useDriverBatching()
          .continueOnError(true)
          .throwOnError(true)
          .send(),
      'Failed to send notification due to errors in one or more channels.',
    )
  })

  test('counts a single recipient failing before channel sending', async ({ assert }) => {
    class FailingNotification extends UserNotification {
      override beforeSend() {
        throw new Error('beforeSend failed')
      }
    }

    const result = await createFacteur()
      .notification(FailingNotification)
      .params({ message: 'Hello' })
      .to([bob])
      .continueOnError(true)
      .send()

    assert.deepEqual(result, { success: 0, failed: 1, results: [] })
  })
})

test.group('Bulk Sending | retries', () => {
  test('retries failed sends', async ({ assert }) => {
    const provider = testProvider()
    const attempts: Record<string, number> = {}

    provider.send = (options: any) => {
      const userId = options.to.id
      attempts[userId] = (attempts[userId] || 0) + 1

      if (userId === '3' && attempts[userId] < 3) {
        throw new Error('Temporary failure')
      }
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(5))
      .concurrency(1)
      .retries(3)
      .send()

    assert.equal(result.success, 5)
    assert.equal(result.failed, 0)
    assert.equal(attempts['3'], 3)
  })

  test('retries only the failing channel, whatever the number of recipients', async ({
    assert,
  }) => {
    class TwoChannelsNotification extends Notification<TestUser, { message: string }> {
      static override options = {
        name: 'TwoChannelsNotification',
        deliverBy: { email: true, sms: true },
      }

      asEmailMessage() {
        return { subject: 'Test', body: this.params.message }
      }

      asSmsMessage() {
        return { body: this.params.message }
      }
    }

    const email = testProvider()
    const sms = testProvider()
    const smsAttempts: Record<string, number> = {}
    const originalSmsSend = sms.send.bind(sms)
    sms.send = (options: any) => {
      smsAttempts[options.to.id] = (smsAttempts[options.to.id] ?? 0) + 1
      if (smsAttempts[options.to.id] === 1) throw new Error('Temporary failure')
      return originalSmsSend(options)
    }

    const facteur = new Facteur({
      channels: { email, sms },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const users = createUsers(2).map((user) => ({
      ...user,
      notificationTargets: () => ({ email: user.email, sms: `+33${user.id}` }),
    }))

    const result = await facteur
      .notification(TwoChannelsNotification)
      .params({ message: 'Hello' })
      .to(users)
      .retries(1)
      .send()

    assert.equal(result.success, 4)
    assert.equal(email.getSentMessages().length, 2)
    assert.deepEqual(smsAttempts, { '1': 2, '2': 2 })
  })

  test('fails after exhausting retries', async ({ assert }) => {
    const provider = testProvider()
    let attempts = 0

    provider.send = (options: any) => {
      if (options.to.id === '2') {
        attempts++
        throw new Error('Permanent failure')
      }
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(3))
      .concurrency(1)
      .retries(2)
      .continueOnError(true)
      .send()

    assert.equal(result.success, 2)
    assert.equal(result.failed, 1)
    assert.equal(attempts, 3)
  })
})

test.group('Bulk Sending | timeout', () => {
  test('times out slow operations', async ({ assert }) => {
    const provider = testProvider()

    provider.send = async (options: any) => {
      if (options.to.id === '2') await setTimeout(500)
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(3))
      .concurrency(3)
      .timeout(50)
      .continueOnError(true)
      .send()

    assert.equal(result.success, 2)
    assert.equal(result.failed, 1)
  })
})

test.group('Bulk Sending | onProgress', () => {
  test('calls onProgress after each recipient', async ({ assert }) => {
    const provider = testProvider()
    const progressCalls: Array<{ completed: number; total: number }> = []

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(5))
      .concurrency(1)
      .onProgress((completed, total) => progressCalls.push({ completed, total }))
      .send()

    assert.equal(progressCalls.length, 5)
    assert.deepEqual(progressCalls, [
      { completed: 1, total: 5 },
      { completed: 2, total: 5 },
      { completed: 3, total: 5 },
      { completed: 4, total: 5 },
      { completed: 5, total: 5 },
    ])
  })

  test('counts recipients failing before channel sending', async ({ assert }) => {
    class FailingNotification extends UserNotification {
      override beforeSend() {
        if (this.notifiable.id === '2') throw new Error('beforeSend failed')
      }
    }

    const progressCalls: number[] = []
    const facteur = new Facteur({
      channels: { email: testProvider() },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const result = await facteur
      .notification(FailingNotification)
      .params({ message: 'Hello' })
      .to(createUsers(3))
      .concurrency(1)
      .continueOnError()
      .onProgress((completed) => progressCalls.push(completed))
      .send()

    assert.equal(result.failed, 1)
    assert.deepEqual(progressCalls, [1, 2, 3])
  })

  test('onProgress works with chunking', async ({ assert }) => {
    const provider = testProvider()
    const progressCalls: Array<{ completed: number; total: number }> = []

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(10))
      .chunkSize(3)
      .concurrency(1)
      .onProgress((completed, total) => progressCalls.push({ completed, total }))
      .send()

    assert.equal(progressCalls.length, 10)
    assert.equal(progressCalls[progressCalls.length - 1]!.completed, 10)
    assert.isTrue(progressCalls.every((p) => p.total === 10))
  })
})

test.group('Bulk Sending | AsyncIterable', () => {
  test('supports async iterable as recipients', async ({ assert }) => {
    const provider = testProvider()

    async function* generateUsers(): AsyncIterable<TestUser> {
      for (let i = 1; i <= 5; i++) {
        yield {
          id: String(i),
          email: `user${i}@test.com`,
          notificationTargets: () => ({ email: `user${i}@test.com` }),
        }
      }
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(generateUsers() as any)
      .send()

    assert.equal(result.success, 5)
    assert.equal(provider.getSentMessages().length, 5)
  })

  test('async iterable with chunking and concurrency', async ({ assert }) => {
    const provider = testProvider()
    let maxConcurrent = 0
    let currentConcurrent = 0

    const originalSend = provider.send.bind(provider)
    provider.send = async (options: any) => {
      currentConcurrent++
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent)
      await setTimeout(5)
      currentConcurrent--
      return originalSend(options)
    }

    async function* generateUsers(): AsyncIterable<TestUser> {
      for (let i = 1; i <= 20; i++) {
        yield {
          id: String(i),
          email: `user${i}@test.com`,
          notificationTargets: () => ({ email: `user${i}@test.com` }),
        }
      }
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(generateUsers() as any)
      .chunkSize(5)
      .concurrency(2)
      .send()

    assert.equal(provider.getSentMessages().length, 20)
    assert.isAtMost(maxConcurrent, 2)
  })
})

test.group('Bulk Sending | edge cases', () => {
  test('single recipient bypasses bulk logic', async ({ assert }) => {
    const provider = testProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(1)[0]!)
      .concurrency(5)
      .chunkSize(10)
      .send()

    assert.equal(result.success, 1)
    assert.equal(provider.getSentMessages().length, 1)
  })

  test('empty recipients array returns empty result', async ({ assert }) => {
    const provider = testProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to([])
      .send()

    assert.equal(result.success, 0)
    assert.equal(result.failed, 0)
    assert.deepEqual(result.results, [])
  })

  test('combines chunking, concurrency, retries and timeout', async ({ assert }) => {
    const provider = testProvider()
    const attempts: Record<string, number> = {}

    const originalSend = provider.send.bind(provider)
    provider.send = async (options: any) => {
      const userId = options.to.id
      attempts[userId] = (attempts[userId] || 0) + 1

      if (userId === '5' && attempts[userId] < 2) {
        throw new Error('Temporary failure')
      }

      await setTimeout(5)
      return originalSend(options)
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const progressCalls: number[] = []

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(createUsers(12))
      .chunkSize(4)
      .concurrency(2)
      .retries(2)
      .timeout('1s')
      .onProgress((completed) => progressCalls.push(completed))
      .send()

    assert.equal(result.success, 12)
    assert.equal(result.failed, 0)
    assert.equal(attempts['5'], 2)
    assert.equal(progressCalls.length, 12)
  })
})
