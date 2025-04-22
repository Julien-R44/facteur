import { Blocks, Message } from 'slack-block-builder'

Message({})

export class SlackMessage {
  #message: typeof Message

  static create() {
    return new SlackMessage()
  }

  constructor() {
    this.#message = Message()
  }

  setBlocks(callback: (blocks: typeof Blocks) => void) {
    callback(Blocks)
    return this
  }
}

SlackMessage.create().setBlocks((blocks) => {
  blocks.Section({ text: 'Hey there, colleague!' })
  blocks.Section({ text: "Hurray for corporate pizza! Let's get you fed and happy :pizza:" })
  blocks.Input({ label: 'What can we call you?' }).label
})
