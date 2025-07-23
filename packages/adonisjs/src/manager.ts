import { Facteur } from '@facteurjs/core'
import type { HttpRouterService } from '@adonisjs/core/types'
import { createFacteurServer, type ServerAdapter } from '@facteurjs/core/api'

import { AdonisServerAdapter } from './server/adapter.js'
import type { Channel, FacteurConfiguration } from './types.js'
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

  registerRoutes() {
    return createFacteurServer({
      facteur: this,
      adapter: this.#serverAdapter,
    })
  }
}
