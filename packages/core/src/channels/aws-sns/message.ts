/**
 * AWS SNS SMS message
 */
export class AwsSnsMessage {
  #message = ''

  /**
   * Creates a new instance of AwsSnsMessage
   */
  static create() {
    return new AwsSnsMessage()
  }

  /**
   * Set the message content
   */
  setMessage(message: string): this {
    this.#message = message
    return this
  }

  /**
   * Serialize the message to AWS SNS format
   */
  serialize() {
    return {
      Message: this.#message,
    }
  }
}
