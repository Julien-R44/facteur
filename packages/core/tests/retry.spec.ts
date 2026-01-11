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

class MultiChannelNotification extends Notification<TestUser, { message: string }> {
  static override options = {
    name: 'MultiChannelNotification',
    tags: ['test'],
    deliverBy: { email: true, sms: true },
  }

  asEmailMessage() {
    return { subject: 'Test', body: this.params.message }
  }

  asSmsMessage() {
    return { body: this.params.message }
  }
}

const testUser: TestUser = {
  id: '1',
  email: 'user@test.com',
  notificationTargets: () => ({ email: 'user@test.com', sms: '+1234567890' }),
}

test.group('Retry | Global config', () => {
  test('applies global retry config to all channels', async ({ assert }) => {
    const provider = testProvider()
    let attempts = 0

    provider.send = () => {
      attempts++
      if (attempts < 3) throw new Error('Temporary failure')
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
      retry: {
        retries: 3,
      },
    })

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(testUser)
      .send()

    assert.equal(result.success, 1)
    assert.equal(attempts, 3)
  })

  test('applies global timeout config', async ({ assert }) => {
    const provider = testProvider()

    provider.send = async () => {
      await setTimeout(500)
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
      retry: {
        timeout: 50,
      },
    })

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(testUser)
      .throwOnError(false)
      .send()

    assert.equal(result.failed, 1)
    assert.equal(result.success, 0)
  })
})

test.group('Retry | Per-channel config', () => {
  test('applies channel-specific retry config', async ({ assert }) => {
    const emailProvider = testProvider()
    const smsProvider = testProvider()

    let emailAttempts = 0
    let smsAttempts = 0

    emailProvider.send = () => {
      emailAttempts++
      if (emailAttempts < 3) throw new Error('Email failure')
    }

    smsProvider.send = () => {
      smsAttempts++
      throw new Error('SMS always fails')
    }

    const facteur = new Facteur({
      channels: { email: emailProvider, sms: smsProvider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
      retry: {
        retries: 1, // Global: 1 retry (2 attempts total)
        channels: {
          email: { retries: 5 }, // Email: 5 retries
          // SMS uses global (1 retry)
        },
      },
    })

    const result = await facteur
      .notification(MultiChannelNotification)
      .params({ message: 'Hello' })
      .to(testUser)
      .throwOnError(false)
      .send()

    assert.equal(emailAttempts, 3) // Succeeded on 3rd attempt
    assert.equal(smsAttempts, 2) // Failed after 2 attempts (1 initial + 1 retry)
    assert.equal(result.success, 1) // Only email succeeded
    assert.equal(result.failed, 1) // SMS failed
  })

  test('channel config overrides global config', async ({ assert }) => {
    const provider = testProvider()

    provider.send = async () => {
      await setTimeout(200)
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
      retry: {
        timeout: 50, // Global: 50ms (would timeout)
        channels: {
          email: { timeout: '1s' }, // Email: 1s (won't timeout)
        },
      },
    })

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(testUser)
      .send()

    assert.equal(result.success, 1)
  })
})

test.group('Retry | Per-send config', () => {
  test('send options override global config', async ({ assert }) => {
    const provider = testProvider()
    let attempts = 0

    provider.send = () => {
      attempts++
      if (attempts < 5) throw new Error('Failure')
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
      retry: {
        retries: 1, // Global: would fail after 2 attempts
      },
    })

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(testUser)
      .retries(5)
      .send()

    assert.equal(result.success, 1)
    assert.equal(attempts, 5)
  })

  test('send options override channel config', async ({ assert }) => {
    const provider = testProvider()

    provider.send = async () => {
      await setTimeout(200)
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
      retry: {
        channels: {
          email: { timeout: 50 }, // Channel: would timeout
        },
      },
    })

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(testUser)
      .timeout('1s')
      .send()

    assert.equal(result.success, 1)
  })
})

test.group('Retry | Combined retry and timeout', () => {
  test('retries on timeout', async ({ assert }) => {
    const provider = testProvider()
    let attempts = 0

    provider.send = async () => {
      attempts++
      if (attempts < 3) await setTimeout(200) // First 2 attempts timeout
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
      retry: {
        retries: 3,
        timeout: 50,
      },
    })

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(testUser)
      .send()

    assert.equal(result.success, 1)
    assert.equal(attempts, 3)
  })

  test('fails after all retries timeout', async ({ assert }) => {
    const provider = testProvider()
    let attempts = 0

    provider.send = async () => {
      attempts++
      await setTimeout(200) // Always timeout
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
      retry: {
        retries: 2,
        timeout: 50,
      },
    })

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(testUser)
      .throwOnError(false)
      .send()

    assert.equal(result.failed, 1)
    assert.equal(attempts, 3) // 1 initial + 2 retries
  })
})

test.group('Retry | No config', () => {
  test('works without any retry config', async ({ assert }) => {
    const provider = testProvider()

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(testUser)
      .send()

    assert.equal(result.success, 1)
  })

  test('fails immediately without retries', async ({ assert }) => {
    const provider = testProvider()
    let attempts = 0

    provider.send = () => {
      attempts++
      throw new Error('Failure')
    }

    const facteur = new Facteur({
      channels: { email: provider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    })

    const result = await facteur
      .notification(UserNotification)
      .params({ message: 'Hello' })
      .to(testUser)
      .throwOnError(false)
      .send()

    assert.equal(result.failed, 1)
    assert.equal(attempts, 1) // No retries
  })
})

test.group('Retry | Multi-channel independence', () => {
  test('each channel retries independently', async ({ assert }) => {
    const emailProvider = testProvider()
    const smsProvider = testProvider()

    let emailAttempts = 0
    let smsAttempts = 0

    emailProvider.send = () => {
      emailAttempts++
      if (emailAttempts < 2) throw new Error('Email failure')
    }

    smsProvider.send = () => {
      smsAttempts++
      // SMS succeeds on first try
    }

    const facteur = new Facteur({
      channels: { email: emailProvider, sms: smsProvider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
      retry: {
        retries: 3,
      },
    })

    const result = await facteur
      .notification(MultiChannelNotification)
      .params({ message: 'Hello' })
      .to(testUser)
      .send()

    assert.equal(emailAttempts, 2) // Email retried once
    assert.equal(smsAttempts, 1) // SMS succeeded first try
    assert.equal(result.success, 2)
    assert.equal(result.failed, 0)
  })

  test('one channel failure does not affect other channels', async ({ assert }) => {
    const emailProvider = testProvider()
    const smsProvider = testProvider()

    emailProvider.send = () => {
      throw new Error('Email always fails')
    }

    const facteur = new Facteur({
      channels: { email: emailProvider, sms: smsProvider },
      discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
      retry: {
        retries: 1,
      },
    })

    const result = await facteur
      .notification(MultiChannelNotification)
      .params({ message: 'Hello' })
      .to(testUser)
      .throwOnError(false)
      .send()

    assert.equal(result.success, 1) // SMS succeeded
    assert.equal(result.failed, 1) // Email failed
    assert.equal(smsProvider.getSentMessages().length, 1)
  })
})
