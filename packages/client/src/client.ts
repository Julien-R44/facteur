import type { KyInstance } from 'ky'

import ky from 'ky'

import type { FacteurClientConfig } from './types.js'

import { PreferencesApi } from './preferences_api.js'
import { NotificationsApi } from './notifications_api.js'

export class FacteurClient<DatabaseContent> {
  #client: KyInstance
  #notifiableId: string

  readonly notifications: NotificationsApi<DatabaseContent>
  readonly preferences: PreferencesApi

  constructor(options: FacteurClientConfig & { notifiableId: string }) {
    const { apiUrl, notifiableId } = options

    this.#notifiableId = notifiableId
    this.#client = ky.create({ prefixUrl: apiUrl, ...options })

    this.notifications = new NotificationsApi(this.#client, this.#notifiableId)
    this.preferences = new PreferencesApi(this.#client, this.#notifiableId)
  }

  /**
   * Get the current notifiable ID
   */
  get notifiableId(): string {
    return this.#notifiableId
  }
}

export function createFacteurClient<
  DatabaseContent extends Record<string, any> = Record<string, any>,
>(options: FacteurClientConfig & { notifiableId: string }): FacteurClient<DatabaseContent> {
  return new FacteurClient<DatabaseContent>(options)
}
