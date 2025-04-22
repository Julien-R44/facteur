import { test } from '@japa/runner'

import { testProvider } from '../helpers/index.js'
import { createFacteur } from '../../src/facteur.js'

test.group('Message', () => {
  test('pick correct providers based on via', async () => {
    const provider = testProvider()
    const provider2 = testProvider()

    const facteur = createFacteur({ providers: { test1: provider, test2: provider2 } })

    const msg = facteur.createMessage({
      name: 'test',
      via: () => ['test1'],
    })

    await msg.send({ name: 'John' }, { message: 'Hello' })

    provider.assertSentCount(1)
    provider2.assertNoneSent()
  })

  test('throw if provider returned from via does not exist', async ({ assert }) => {
    const provider = testProvider()
    const provider2 = testProvider()

    const facteur = createFacteur({ providers: { test: provider, test2: provider2 } })

    const msg = facteur.createMessage({
      name: 'test',
      via: () => ['test3' as any],
    })

    await assert.rejects(
      () => msg.send({ name: 'John' }, { message: 'Hello' }),
      "Provider 'test3' was selected through 'via' but does not exist",
    )
  })

  test('use every provider if no via is defined', async () => {
    const provider = testProvider()
    const provider2 = testProvider()

    const facteur = createFacteur({ providers: { test: provider, test2: provider2 } })

    const msg = facteur.createMessage({
      name: 'test',
    })

    await msg.send({ name: 'John' }, { message: 'Hello' })

    provider.assertSentCount(1)
    provider2.assertSentCount(1)
  })
})
