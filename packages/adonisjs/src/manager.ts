import { Facteur } from '@facteurjs/core'
import { createFacteurServer } from '@facteurjs/core/api'
import type { HttpContext } from '@adonisjs/core/http'
import type { HttpRouterService } from '@adonisjs/core/types'
import type { ServerAdapter } from '@facteurjs/core/api/types'

import { AdonisServerAdapter } from './server/adapter.js'
import type { AdonisAuthorizationCallback, Channel, FacteurConfiguration } from './types.js'
import type { DatabaseAdapter } from '../../core/src/database/types.js'

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
