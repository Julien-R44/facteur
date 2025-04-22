import { AssertionError } from 'node:assert'

import type { Provider } from '../../src/types.js'

class TestProvider implements Provider<any, any, any, any> {
  #sent: Array<{ notifiable: any; message: any }> = []
  #queued: Array<{ notifiable: any; message: any }> = []

  send(options: { notifiable: any; message: any }) {
    this.#sent.push(options)
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
