import { test } from '@japa/runner'

import { BoringNodeQueueAdapter } from '../src/adapter.ts'

test.group('BoringNodeQueueAdapter', () => {
  test('creates adapter with default config', async ({ assert }) => {
    const adapter = new BoringNodeQueueAdapter()
    assert.isDefined(adapter)
  })

  test('creates adapter with custom default queue', async ({ assert }) => {
    const adapter = new BoringNodeQueueAdapter({ defaultQueue: 'custom-queue' })
    assert.isDefined(adapter)
  })
})
