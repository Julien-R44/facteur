import type { Facteur } from '@facteurjs/core'
import type { ApplicationService } from '@adonisjs/core/types'

import type { defineConfig } from '../define_config.js'

declare module '@adonisjs/core/types' {
  export interface ContainerBindings {
    'notifications.manager': Facteur<any>
  }

  export interface EventsList {
    'notifications:message:send': any
    'notifications:message:sent': any
  }
}

export default class NotificationsProvider {
  constructor(protected app: ApplicationService) {}

  async register() {
    const config = this.app.config.get<ReturnType<typeof defineConfig>>('notifications')

    this.app.container.singleton('notifications.manager', async () => {
      const { createFacteur } = await import('@facteurjs/core')
      const emitter = await this.app.container.make('emitter')

      const resolvedChannels = Object.entries(config.channels).map(async ([name, channel]) => {
        return [name, await channel.resolver(this.app)]
      })

      return createFacteur({
        emitter: emitter as any,
        channels: await Object.fromEntries(await Promise.all(resolvedChannels)),
      })
    })
  }
}
