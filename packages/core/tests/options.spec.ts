import { test } from '@japa/runner'

import { FacteurOptions } from '../src/options.ts'

test.group('Options', () => {
  test('Correctly resolve default preferences', ({ assert }) => {
    const options = new FacteurOptions({
      channels: {
        sms: null as any,
        email: null as any,
        discord: null as any,
        teams: null as any,
      },
      discoverer: null as any,
      preferences: {
        enabled: true,
        global: { channels: { discord: true, teams: false, email: true, sms: false } },
        categories: { marketing: false, alerts: { channels: { email: false } } },
      },
    })

    assert.deepEqual(options.defaultPreferences, {
      enabled: true,
      global: { channels: { discord: true, teams: false, email: true, sms: false } },
      categories: {
        marketing: { channels: { sms: false, email: false, discord: false, teams: false } },
        alerts: { channels: { email: false, sms: false, discord: true, teams: false } },
      },
    })
  })

  test('Should use all channels enabled when no global preferences are specified', ({ assert }) => {
    const options = new FacteurOptions({
      channels: {
        sms: null as any,
        email: null as any,
        discord: null as any,
        slack: null as any,
      },
      discoverer: null as any,
      preferences: {
        categories: {
          security: { channels: { sms: false } },
          updates: true,
        },
      },
    })

    assert.deepEqual(options.defaultPreferences, {
      enabled: true,
      global: { channels: { sms: true, email: true, discord: true, slack: true } },
      categories: {
        security: { channels: { sms: false, email: true, discord: true, slack: true } },
        updates: { channels: { sms: true, email: true, discord: true, slack: true } },
      },
    })
  })

  test('Should handle complex preferences with multiple category overrides', ({ assert }) => {
    const options = new FacteurOptions({
      channels: {
        email: null as any,
        sms: null as any,
        push: null as any,
        webhook: null as any,
      },
      discoverer: null as any,
      preferences: {
        enabled: false,
        global: { channels: { email: true, sms: false, push: true, webhook: false } },
        categories: {
          critical: { channels: { sms: true, webhook: true } },
          promotional: false,
          system: { channels: { email: false, push: false } },
        },
      },
    })

    assert.deepEqual(options.defaultPreferences, {
      enabled: false,
      global: { channels: { email: true, sms: false, push: true, webhook: false } },
      categories: {
        critical: { channels: { email: true, sms: true, push: true, webhook: true } },
        promotional: { channels: { email: false, sms: false, push: false, webhook: false } },
        system: { channels: { email: false, sms: false, push: false, webhook: false } },
      },
    })
  })
})
