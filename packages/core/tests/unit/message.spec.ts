import { test } from '@japa/runner'

import { testProvider } from '../helpers/index.js'
import { createFacteur } from '../../src/facteur.js'

test.group('Message', () => {
  test('pick correct providers based on via', async () => {
    const provider = testProvider({ name: 'test1' })
    const provider2 = testProvider({ name: 'test2' })

    const facteur = createFacteur({ providers: [provider, provider2] })

    const msg = facteur.createMessage({
      name: 'test',
      via: () => ['test1'],
    })

    await msg.send({ name: 'John' }, { message: 'Hello' })

    provider.provider.assertSentCount(1)
    provider2.provider.assertNoneSent()
  })

  test('throw if provider returned from via does not exist', async ({ assert }) => {
    const provider = testProvider({ name: 'test1' })
    const provider2 = testProvider({ name: 'test2' })

    const facteur = createFacteur({ providers: [provider, provider2] })

    const msg = facteur.createMessage({
      name: 'test',
      via: () => ['test3' as any],
    })

    await assert.rejects(
      () => msg.send({ name: 'John' }, { message: 'Hello' }),
      'Provider test3 not found',
    )
  })

  test('use every provider if no via is defined', async () => {
    const provider = testProvider({ name: 'test1' })
    const provider2 = testProvider({ name: 'test2' })

    const facteur = createFacteur({ providers: [provider, provider2] })

    const msg = facteur.createMessage({
      name: 'test',
    })

    await msg.send({ name: 'John' }, { message: 'Hello' })

    provider.provider.assertSentCount(1)
    provider2.provider.assertSentCount(1)
  })
})
