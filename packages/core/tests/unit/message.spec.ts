import { test } from '@japa/runner'
import EventEmitter from 'node:events'
import { pEventMultiple } from 'p-event'

import { testProvider } from '../helpers/index.js'
import { createFacteur } from '../../src/facteur.js'

test.group('Message', () => {
  test('pick correct providers based on via', async () => {
    const provider = testProvider()
    const provider2 = testProvider()

    const facteur = createFacteur({ providers: { test1: provider, test2: provider2 } })

    const msg = facteur.defineMessage(() => ({
      name: 'test',
      via: () => ['test1'],
    }))

    await msg.send({
      params: { name: 'John' },
      via: { test1: true },
    })

    provider.assertSentCount(1)
    provider2.assertNoneSent()
  })

  test('throw if provider returned from via does not exist', async ({ assert }) => {
    const provider = testProvider()
    const provider2 = testProvider()

    const facteur = createFacteur({ providers: { test: provider, test2: provider2 } })

    const msg = facteur.defineMessage(() => ({
      name: 'test',
      via: () => ['test3' as any],
    }))

    await assert.rejects(
      () => msg.send({ params: { foo: true } }),
      "Provider 'test3' was selected through 'via' but does not exist",
    )
  })

  test('use every provider if no via is defined', async () => {
    const provider = testProvider()
    const provider2 = testProvider()

    const facteur = createFacteur({ providers: { test: provider, test2: provider2 } })

    const msg = facteur.defineMessage(() => ({
      name: 'test',
    }))

    await msg.send({ params: { name: 'John' } })

    provider.assertSentCount(1)
    provider2.assertSentCount(1)
  })

  test('emit an event before sending', async ({ assert }) => {
    const emitter = new EventEmitter()
    const provider = testProvider()
    const provider2 = testProvider()

    const facteur = createFacteur({
      emitter,
      providers: { test: provider, test2: provider2 },
    })

    const msg = facteur.defineMessage(() => ({
      name: 'test',
      via: () => ['test', 'test2'],
      toTest: () => ({ foo: true }),
      toTest2: () => ({ bar: true }),
    }))

    const pEventPromise = pEventMultiple(emitter, 'facteur:message:send', { count: 2 })
    await msg.send({ params: { name: 'John' } })
    const sentEvent = await pEventPromise

    assert.deepEqual(sentEvent[0], {
      provider: 'test',
      message: { foo: true },
      targets: undefined,
      params: { name: 'John' },
      notifiable: undefined,
    })

    assert.deepEqual(sentEvent[1], {
      provider: 'test2',
      message: { bar: true },
      targets: undefined,
      params: { name: 'John' },
      notifiable: undefined,
    })
  })
})
