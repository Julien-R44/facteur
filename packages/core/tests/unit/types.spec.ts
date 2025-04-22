import { test } from '@japa/runner'

import { testProvider } from '../helpers/index.js'
import { createFacteur } from '../../src/facteur.js'

test.group('Types', () => {
  test('functional style', ({ expectTypeOf }) => {
    const facteur = createFacteur({
      providers: {
        foo: testProvider(),
        bar: testProvider(),
        BarBar: testProvider(),
      },
    })

    type User = { email: string }

    type Payload = { foo: string }

    const msg = facteur.createMessage<User, Payload>({
      name: 'foo',

      // @ts-expect-error unvalid provider
      via(notifiable) {
        expectTypeOf(notifiable).toMatchTypeOf<User>()

        return ['foo', 'not-valid']
      },

      toFoo(options) {
        expectTypeOf(options.notifiable).toMatchTypeOf<User>()
        expectTypeOf(options.params).toMatchTypeOf<Payload>()
        return null as any
      },

      // @ts-expect-error unvalid provider
      toCaca(options) {
        expectTypeOf(options.notifiable).toBeAny()
        return null as any
      },

      toBarBar(options) {
        expectTypeOf(options.notifiable).toMatchTypeOf<User>()
        expectTypeOf(options.params).toMatchTypeOf<Payload>()
        return null as any
      },
    })

    expectTypeOf(msg.send).parameter(0).toMatchTypeOf<User>()
    expectTypeOf(msg.send).parameter(1).toMatchTypeOf<Payload>()
  })
})
