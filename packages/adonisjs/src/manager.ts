import type { ServerAdapter } from '@facteurjs/core/api/types'
import type { HttpRouterService } from '@adonisjs/core/types'
import type { HttpContext } from '@adonisjs/core/http'

import { createFacteurServer } from '@facteurjs/core/api'
import { Facteur } from '@facteurjs/core'

import type { AdonisAuthorizationCallback, Channel, FacteurConfiguration } from './types.ts'
import type { DatabaseAdapter } from '@facteurjs/core/database/types'

import { AdonisServerAdapter } from './server/adapter.ts'

export class NotificationManager<
  KnownChannels extends Record<string, Channel>,
  DBAdapter extends DatabaseAdapter | null = null,
> extends Facteur<KnownChannels, DBAdapter> {
  #serverAdapter: ServerAdapter

  constructor(config: FacteurConfiguration<KnownChannels, DBAdapter>, router: HttpRouterService) {
    super(config)
    this.#serverAdapter = new AdonisServerAdapter(router)
  }

  /**
   * Register the notification API routes
   */
  registerRoutes(options: { authorize: AdonisAuthorizationCallback }) {
    return createFacteurServer({
      facteur: this,
      adapter: this.#serverAdapter,
      authorize: (context) => {
        const ctx = context.request.context as HttpContext

        return options.authorize({
          notifiableId: context.notifiableId,
          tenantId: context.tenantId,
          ctx,
        })
      },
    })
  }
}
