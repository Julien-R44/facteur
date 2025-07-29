export class SocketIoMessage {
  #data: Record<string, any> = {}

  static create() {
    return new SocketIoMessage()
  }

  setData(data: Record<string, any>) {
    this.#data = data
    return this
  }

  serialize() {
    return { data: this.#data }
  }
}
