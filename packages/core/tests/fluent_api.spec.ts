import { test } from '@japa/runner'

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

class NoParamsNotification extends Notification<TestUser> {
  static override options = {
    name: 'NoParamsNotification',
    tags: ['test'],
    deliverBy: { email: true },
  }

  asEmailMessage() {
    return { subject: 'Test', body: 'Hello' }
  }
}

class AnonymousNotification extends Notification<undefined> {
  static override options = {
    name: 'AnonymousNotification',
    tags: ['test'],
    deliverBy: { email: true },
  }

  asEmailMessage() {
    return { subject: 'Test', body: 'Anonymous' }
  }
}

const testUser: TestUser = {
  id: '1',
  email: 'test@example.com',
  notificationTargets: () => ({ email: 'test@example.com' }),
}

test.group('Fluent API | Builder behavior', () => {
  test('builder is reusable - can call send() multiple times', async ({ assert }) => {
    const provider = testProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const builder = facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(testUser)

    await builder.send()
    await builder.send()

    assert.equal(provider.getSentMessages().length, 2)
  })

  test('methods can be called in any order', async ({ assert }) => {
    const provider = testProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    // Order 1: params -> to
    await facteur
      .notification(UserNotification)
      .params({ message: 'Order 1' })
      .to(testUser)
      .send()

    // Order 2: to -> params
    await facteur
      .notification(UserNotification)
      .to(testUser)
      .params({ message: 'Order 2' })
      .send()

    // Order 3: with options in between
    await facteur
      .notification(UserNotification)
      .concurrency(5)
      .params({ message: 'Order 3' })
      .retries(2)
      .to(testUser)
      .timeout('10s')
      .send()

    assert.equal(provider.getSentMessages().length, 3)
  })

  test('notification without required params can skip params()', async ({ assert }) => {
    const provider = testProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    await facteur
      .notification(NoParamsNotification)
      .to(testUser)
      .send()

    assert.equal(provider.getSentMessages().length, 1)
  })

  test('anonymous notification works with via() instead of to()', async ({ assert }) => {
    const provider = testProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    await facteur
      .notification(AnonymousNotification)
      .via({ email: { to: 'anon@example.com' } })
      .send()

    assert.equal(provider.getSentMessages().length, 1)
  })
})

test.group('Fluent API | Options passthrough', () => {
  test('all bulk options are passed correctly', async ({ assert }) => {
    const provider = testProvider()
    let maxConcurrent = 0
    let currentConcurrent = 0
    const progressCalls: number[] = []

    const originalSend = provider.send.bind(provider)
    provider.send = async (options: any) => {
      currentConcurrent++
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent)
      await new Promise((r) => setTimeout(r, 10))
      currentConcurrent--
      return originalSend(options)
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const users: TestUser[] = Array.from({ length: 6 }, (_, i) => ({
      id: String(i + 1),
      email: `user${i + 1}@test.com`,
      notificationTargets: () => ({ email: `user${i + 1}@test.com` }),
    }))

    await facteur
      .notification(UserNotification)
      .params({ message: 'Test' })
      .to(users)
      .chunkSize(3)
      .concurrency(2)
      .onProgress((completed) => progressCalls.push(completed))
      .send()

    assert.equal(provider.getSentMessages().length, 6)
    assert.isAtMost(maxConcurrent, 2)
    assert.deepEqual(progressCalls, [1, 2, 3, 4, 5, 6])
  })

  test('tenant is passed correctly', async ({ assert }) => {
    const provider = testProvider()
    let capturedTenantId: any

    const originalSend = provider.send.bind(provider)
    provider.send = (options: any) => {
      capturedTenantId = options.tenantId
      return originalSend(options)
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    await facteur
      .notification(UserNotification)
      .params({ message: 'Test' })
      .to(testUser)
      .tenant('org_123')
      .send()

    assert.equal(capturedTenantId, 'org_123')
  })

  test('via overrides channel targets correctly', async ({ assert }) => {
    const emailProvider = testProvider()

    const facteur = new Facteur({
      channels: { email: emailProvider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    // User with default target
    const user: TestUser = {
      id: '1',
      email: 'default@test.com',
      notificationTargets: () => ({ email: 'default@test.com' }),
    }

    await facteur
      .notification(UserNotification)
      .params({ message: 'Test' })
      .to(user)
      .via({ email: { to: 'override@test.com' } }) // Override email target
      .send()

    assert.equal(emailProvider.getSentMessages().length, 1)
    assert.equal(emailProvider.getSentMessages()[0]!.targets.to, 'override@test.com')
  })



  test('throwOnError(false) returns result instead of throwing', async ({ assert }) => {
    const provider = testProvider()
    provider.throws()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Test' })
      .to(testUser)
      .throwOnError(false)
      .send()

    assert.equal(result.failed, 1)
    assert.equal(result.success, 0)
  })

  test('continueOnError works with multiple recipients', async ({ assert }) => {
    const provider = testProvider()
    let callCount = 0

    provider.send = () => {
      callCount++
      if (callCount === 2) throw new Error('Test error')
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const users: TestUser[] = Array.from({ length: 5 }, (_, i) => ({
      id: String(i + 1),
      email: `user${i + 1}@test.com`,
      notificationTargets: () => ({ email: `user${i + 1}@test.com` }),
    }))

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Test' })
      .to(users)
      .concurrency(1)
      .continueOnError()
      .send()

    assert.equal(callCount, 5) // All 5 were attempted
    assert.equal(result.success, 4)
    assert.equal(result.failed, 1)
  })
})

test.group('Fluent API | Type safety', (group) => {
  group.tap((t) => t.skip(true, 'Type-only tests'))

  test('send() not available without to() for non-anonymous notification', async () => {
    const facteur = new Facteur({
      channels: { email: testProvider() },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    // @ts-expect-error - send() should not be available without to()
    facteur.notification(UserNotification).params({ message: 'Test' }).send()
  })

  test('send() not available without via() for anonymous notification', async () => {
    const facteur = new Facteur({
      channels: { email: testProvider() },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    // @ts-expect-error - send() should not be available without via() for anonymous
    facteur.notification(AnonymousNotification).send()
  })

  test('to() not available for anonymous notification', async () => {
    const facteur = new Facteur({
      channels: { email: testProvider() },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    // @ts-expect-error - to() should not be available for anonymous notifications
    facteur.notification(AnonymousNotification).to(testUser)
  })

  test('params type is inferred from notification', async () => {
    const facteur = new Facteur({
      channels: { email: testProvider() },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    // @ts-expect-error - wrong params type
    facteur.notification(UserNotification).params({ wrongKey: 'value' })

    // This should work
    facteur.notification(UserNotification).params({ message: 'correct' })
  })

  test('to() type is inferred from notification', async () => {
    const facteur = new Facteur({
      channels: { email: testProvider() },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    // @ts-expect-error - wrong recipient type
    facteur.notification(UserNotification).to({ wrongShape: true })

    // This should work
    facteur.notification(UserNotification).to(testUser)
  })
})
