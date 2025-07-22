export class TransmitMessage {
  #content: Record<string, any> = {}

  static create() {
    return new TransmitMessage()
  }

  setContent(content: Record<string, any>) {
    this.#content = content
    return this
  }

  serialize() {
    return { content: this.#content }
  }
}
