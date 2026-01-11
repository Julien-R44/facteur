import type { FacteurEvents } from '@facteurjs/core/types'
import type { ApplicationService } from '@adonisjs/core/types'

import type { defineConfig } from '../define_config.ts'

import { NotificationManager } from '../manager.ts'

declare module '@adonisjs/core/types' {
  export interface ContainerBindings {
    // TODO
    'notifications.manager': NotificationManager<any, any>
  }

  export interface EventsList extends FacteurEvents {}
}

export default class NotificationsProvider {
  constructor(protected app: ApplicationService) {}

  async register() {
    const config = this.app.config.get<ReturnType<typeof defineConfig>>('notifications')

    this.app.container.singleton('notifications.manager', async () => {
      const emitter = await this.app.container.make('emitter')
      const router = await this.app.container.make('router')

      const resolvedChannels = Object.entries(config.channels).map(async ([name, channel]) => {
        return [name, await channel.resolver(this.app)]
      })

      const dbAdapter = await config.databaseAdapter?.resolver(this.app)
      const notifications = new NotificationManager(
        {
          channels: await Object.fromEntries(await Promise.all(resolvedChannels)),
          // queueAdapter: config.queueAdapter,
          databaseAdapter: dbAdapter ?? null,
          emitter: emitter as any,
          discoverer: { searchDirectory: new URL('./app', this.app.appRoot) },
          notificationResolver: (notification, ctx) => this.app.container.make(notification, [ctx]),
        },
        router,
      )
      await notifications.discoverer.discoverNotifications()
      return notifications
    })
  }
}
