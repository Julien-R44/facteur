import { AssertionError } from 'node:assert'

import {
  kTargetSymbol,
  Notification,
  type Channel,
  type ChannelSendParams,
} from '../../src/types/index.js'
import { FacteurDatabase } from '../../src/database/database.js'
import type {
  DatabaseAdapter,
  GetPreferencesParams,
  Preferences,
} from '../../src/database/types.js'
import { Facteur } from '../../src/facteur.js'
import type { HTTPRequest } from '../../src/api/types.js'

class TestProvider implements Channel<any, any, any, any> {
  name = 'test' as const;
  [kTargetSymbol] = null as any
  #sent: Array<ChannelSendParams<any, any>> = []
  #queued: Array<ChannelSendParams<any, any>> = []
  #isThrowing = false

  send(options: ChannelSendParams<any, any>) {
    if (this.#isThrowing) {
      throw new Error('Test error')
    }

    this.#sent.push(options)
  }

  throws() {
    this.#isThrowing = true
  }

  restore() {
    this.#isThrowing = false
  }

  getSentMessages() {
    return this.#sent
  }

  assertNoneSent() {
    if (!this.#sent.length) return

    throw new AssertionError({
      message: `Expected no notifications to be sent, instead ${this.#sent.length} were sent`,
      expected: [],
      actual: this.#sent,
    })
  }

  assertSentCount(count: number) {
    if (this.#sent.length === count) return

    throw new AssertionError({
      message: `Expected ${count} notifications to be sent, instead ${this.#sent.length} were sent`,
      expected: count,
      actual: this.#sent.length,
    })
  }

  assertQueuedCount(count: number) {
    if (this.#queued.length === count) return

    throw new AssertionError({
      message: `Expected ${count} notifications to be queued, instead ${this.#queued.length} were queued`,
      expected: count,
      actual: this.#queued.length,
    })
  }

  assertNoneQueued() {
    if (!this.#queued.length) return

    throw new AssertionError({
      message: `Expected no notifications to be queued, instead ${this.#queued.length} were queued`,
      expected: [],
      actual: this.#queued,
    })
  }
}

export function testProvider() {
  return new TestProvider()
}

export class FakeNotification extends Notification<undefined, any> {
  static override options = {
    name: 'FakeNotification',
    tags: ['test'],
    deliverBy: {
      email: true,
      sms: true,
    },
  }

  asEmailMessage() {
    return {
      subject: 'Test Email',
      body: 'This is a test email',
    }
  }

  asSmsMessage() {
    return {
      body: 'This is a test SMS',
    }
  }
}

export class FakeDatabase extends FacteurDatabase {
  #notifications: any[] = []

  constructor(protected preferences?: Preferences) {
    super(null as any, null as any)
  }

  override async getPreferences(_options: GetPreferencesParams): Promise<Preferences> {
    if (this.preferences) return this.preferences

    return {
      global: {
        notifications: [],
        global: {
          channels: {
            email: true,
            sms: true,
          },
        },
      },
    }
  }

  override async getNotifications(_options: any): Promise<any[]> {
    return this.#notifications
  }

  override async updateNotification(_options: any): Promise<void> {}

  override async updateAllNotifications(_options: any): Promise<void> {}

  override async updatePreferences(_options: any): Promise<void> {}
}

/**
 * A fake DatabaseAdapter for testing purposes.
 * Implements the DatabaseAdapter interface directly.
 */
export function createFakeDatabaseAdapter(): DatabaseAdapter {
  return {
    save: async () => {},
    getNotifications: async () => [],
    updateNotification: async () => {},
    updateAllNotifications: async () => {},
    pruneNotifications: async () => {},
    getPreferences: async () => [],
    updatePreferences: async () => {},
  }
}

export function createMockRequest(overrides: Partial<HTTPRequest> = {}): HTTPRequest {
  return { body: {}, params: {}, query: {}, headers: {}, ...overrides }
}

export function createFacteurWithDb() {
  const provider = testProvider()
  const adapter = createFakeDatabaseAdapter()

  const facteur = new Facteur({
    channels: { email: provider },
    discoverer: { searchDirectory: new URL('./notifications', import.meta.url) },
    databaseAdapter: adapter,
  })

  return { facteur, adapter, provider }
}
