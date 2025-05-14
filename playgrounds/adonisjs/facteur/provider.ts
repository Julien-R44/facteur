import { ApplicationService } from '@adonisjs/core/types'
import { defineConfig } from './define_config.js'

declare module '@adonisjs/core/types' {
  export interface ContainerBindings {
    'notifications.manager': any
  }

  export interface EventsList {
    'notifications:message:send': any
    'notifications:message:sent': any
  }
}

export class NotificationsProvider {
  constructor(protected app: ApplicationService) {}

  async register() {
    const config = this.app.config.get<ReturnType<typeof defineConfig>>('notifications')

    this.app.container.singleton('notifications.manager', async () => {
      const { createFacteur } = await import('@facteurjs/core')
      const emitter = await this.app.container.make('emitter')

      return createFacteur({ emitter: emitter as any, ...config })
    })
  }
}
