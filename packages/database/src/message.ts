export class DatabaseMessage {
  static create() {
    return new DatabaseMessage()
  }

  #type: string = 'default'
  #content: any = {}
  #notifiableId: string = ''

  setType(type: string) {
    this.#type = type
    return this
  }

  setNotifiableId(notifiableId: string) {
    this.#content.notifiableId = notifiableId
    return this
  }

  setContent(content: any) {
    this.#content = content
    return this
  }

  serialize() {
    return {
      type: this.#type,
      content: this.#content,
      notifiableId: this.#notifiableId,
    }
  }
}
