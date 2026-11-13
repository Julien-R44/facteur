import type { DatabaseAdapter } from '@facteurjs/core/database/types'
import type { ConfigProvider } from '@adonisjs/core/types'

import { test } from '@japa/runner'
import { kTargetSymbol, Notification } from '@facteurjs/core/types'
import { IgnitorFactory } from '@adonisjs/core/factories'
import { configProvider } from '@adonisjs/core'

import type { InferDatabase } from '../src/types.ts'

import NotificationsProvider from '../src/providers/facteur_provider.ts'
import { defineConfig } from '../src/define_config.ts'

type FacteurService = typeof import('../src/services/main.ts').default

test('InferDatabase tells whether the config defines a database adapter', ({ expectTypeOf }) => {
  const withAdapter = defineConfig({
    channels: {},
    databaseAdapter: {} as ConfigProvider<DatabaseAdapter>,
  })
  const withoutAdapter = defineConfig({ channels: {} })

  expectTypeOf<InferDatabase<typeof withAdapter>>().toEqualTypeOf<{ adapter: DatabaseAdapter }>()
  expectTypeOf<InferDatabase<typeof withoutAdapter>>().toEqualTypeOf<{ adapter: null }>()
})

test('facteur service exposes the database layer when not augmented', ({ expectTypeOf }) => {
  expectTypeOf<FacteurService['db']>().not.toBeNever()
  expectTypeOf<FacteurService['db']>().toHaveProperty('getNotifications')
})

test('provider respects global and category delivery preferences')
  .with([true, false])
  .run(async ({ assert, cleanup }, marketingEnabled) => {
    class MarketingNotification extends Notification {
      static override options = {
        name: 'Marketing',
        category: 'marketing',
        deliverBy: { email: true },
      }

      asEmailMessage() {
        return 'marketing'
      }
    }

    class TransactionalNotification extends Notification {
      static override options = { name: 'Transactional', deliverBy: { email: true } }

      asEmailMessage() {
        return 'transactional'
      }
    }

    const delivered: string[] = []
    const config = defineConfig({
      channels: {
        email: configProvider.create(async () => ({
          name: 'email',
          [kTargetSymbol]: null,
          send: async ({ message }: { message: string }) => {
            delivered.push(message)
          },
        })),
      },
      preferences: {
        global: { channels: { email: !marketingEnabled } },
        categories: { marketing: marketingEnabled },
      },
    })
    const app = new IgnitorFactory()
      .withCoreProviders()
      .withCoreConfig()
      .merge({
        config: { notifications: config },
        rcFileContents: { providers: [async () => ({ default: NotificationsProvider })] },
      })
      .create(new URL('../', import.meta.url))
      .createApp('web')
    cleanup(() => app.terminate())
    await app.init()
    await app.boot()

    const facteur = await app.container.make('notifications.manager')
    const recipient = { notificationTargets: () => ({ email: { address: 'alice@example.com' } }) }

    await facteur.notification(MarketingNotification).to(recipient).send()
    await facteur.notification(TransactionalNotification).to(recipient).send()

    assert.deepEqual(delivered, [marketingEnabled ? 'marketing' : 'transactional'])
  })
