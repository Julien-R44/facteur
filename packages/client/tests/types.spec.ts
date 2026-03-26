import { test } from '@japa/runner'

import type { Preferences, UpdatePreferencesOptions } from '../src/types.ts'

test.group('Client types', () => {
  test('UpdatePreferencesOptions preferences should accept flat channel booleans', ({
    expectTypeOf,
  }) => {
    expectTypeOf<{ mail: true; sms: false }>().toMatchTypeOf<
      UpdatePreferencesOptions['preferences']
    >()
  })

  test('UpdatePreferencesOptions should accept category', ({ expectTypeOf }) => {
    expectTypeOf<{ preferences: { mail: false }; category: 'billing' }>().toMatchTypeOf<UpdatePreferencesOptions>()
  })

  test('Preferences should have global with channels and notifications', ({ expectTypeOf }) => {
    expectTypeOf<Preferences>().toHaveProperty('global')
    expectTypeOf<Preferences['global']>().toHaveProperty('global')
    expectTypeOf<Preferences['global']>().toHaveProperty('notifications')
    expectTypeOf<Preferences['global']['global']['channels']>().toMatchTypeOf<
      Record<string, boolean>
    >()
  })
})
