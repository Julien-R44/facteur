import type { DatabaseContent } from '../types/extend.js'
import type { NotificationStatus } from './types.js'

export class DatabaseMessage {
  static create() {
    return new DatabaseMessage()
  }

  #type: string = 'default'
  #tags: string[] = []
  #content: any = {}
  #notifiableId?: string | number
  #tenantId?: string | number
  #status: NotificationStatus = 'unread'

  setType(type: string) {
    this.#type = type
    return this
  }

  setTags(tags: string[]) {
    this.#tags = tags
    return this
  }

  setNotifiableId(notifiableId: string | number) {
    this.#notifiableId = notifiableId
    return this
  }

  setTenantId(tenantId: string | number) {
    this.#tenantId = tenantId
    return this
  }

  setStatus(status: NotificationStatus) {
    this.#status = status
    return this
  }

  setContent(content: DatabaseContent) {
    this.#content = content
    return this
  }

  serialize() {
    return {
      type: this.#type,
      content: this.#content,
      notifiableId: this.#notifiableId,
      tenantId: this.#tenantId,
      status: this.#status,
      tags: this.#tags,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }
}
