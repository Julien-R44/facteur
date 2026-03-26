import type { KyInstance } from 'ky'

import type { Preferences, UpdatePreferencesOptions } from './types.ts'

export class PreferencesApi {
  #client: KyInstance
  #notifiableId: string

  constructor(client: KyInstance, notifiableId: string) {
    this.#client = client
    this.#notifiableId = notifiableId
  }

  /**
   * Get notification preferences for the user
   */
  async list(options: { tenantId?: string } = {}): Promise<Preferences> {
    const searchParams = new URLSearchParams()
    if (options.tenantId) searchParams.set('tenantId', options.tenantId)

    return this.#client
      .get(`notifications/notifiable/${this.#notifiableId}/preferences`, { searchParams })
      .json<Preferences>()
  }

  /**
   * Update notification preferences for the user
   */
  async update(options: UpdatePreferencesOptions): Promise<void> {
    await this.#client
      .post(`notifications/notifiable/${this.#notifiableId}/preferences`, { json: options })
      .json()
  }
}
