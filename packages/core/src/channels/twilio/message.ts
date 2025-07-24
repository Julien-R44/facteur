export class TwilioMessage {
  #body = ''
  #from?: string
  #messagingServiceSid?: string
  #alphanumericSender?: string
  #maxPrice?: number
  #validityPeriod?: number
  #forceDelivery?: boolean
  #provideFeedback?: boolean
  #applicationSid?: string

  /**
   * Creates a new instance of TwilioMessage
   */
  static create() {
    return new TwilioMessage()
  }

  /**
   * Sets the message content/body
   */
  setBody(body: string) {
    this.#body = body
    return this
  }

  /**
   * Gets the message body
   */
  getBody() {
    return this.#body
  }

  /**
   * Sets the sender phone number
   */
  setFrom(from: string) {
    this.#from = from
    return this
  }

  /**
   * Gets the sender phone number
   */
  getFrom() {
    return this.#from
  }

  /**
   * Sets the messaging service SID
   */
  setMessagingServiceSid(sid: string) {
    this.#messagingServiceSid = sid
    return this
  }

  /**
   * Gets the messaging service SID.
   */
  getMessagingServiceSid() {
    return this.#messagingServiceSid
  }

  /**
   * Sets the alphanumeric sender
   */
  setAlphanumericSender(sender: string) {
    this.#alphanumericSender = sender
    return this
  }

  /**
   * Gets the alphanumeric sender
   */
  getAlphanumericSender() {
    return this.#alphanumericSender
  }

  /**
   * Sets the maximum price per message in USD
   */
  setMaxPrice(price: number) {
    this.#maxPrice = price
    return this
  }

  /**
   * Gets the maximum price.
   */
  getMaxPrice() {
    return this.#maxPrice
  }

  /**
   * Sets the validity period in seconds
   */
  setValidityPeriod(seconds: number) {
    this.#validityPeriod = seconds
    return this
  }

  /**
   * Gets the validity period.
   */
  getValidityPeriod() {
    return this.#validityPeriod
  }

  /**
   * Sets force delivery option.
   */
  setForceDelivery(force: boolean) {
    this.#forceDelivery = force
    return this
  }

  /**
   * Gets force delivery option
   */
  getForceDelivery() {
    return this.#forceDelivery
  }

  /**
   * Sets provide feedback option
   */
  setProvideFeedback(provide: boolean) {
    this.#provideFeedback = provide
    return this
  }

  /**
   * Gets provide feedback option.
   */
  getProvideFeedback() {
    return this.#provideFeedback
  }

  /**
   * Sets the application SID for status callbacks.
   */
  setApplicationSid(sid: string) {
    this.#applicationSid = sid
    return this
  }

  /**
   * Gets the application SID
   */
  getApplicationSid() {
    return this.#applicationSid
  }

  /**
   * Serializes the message to Twilio API format
   */
  serialize() {
    const data: Record<string, any> = { body: this.#body }

    if (this.#from) data.from = this.#from
    if (this.#messagingServiceSid) data.messagingServiceSid = this.#messagingServiceSid
    if (this.#maxPrice !== undefined) data.maxPrice = this.#maxPrice
    if (this.#validityPeriod !== undefined) data.validityPeriod = this.#validityPeriod
    if (this.#forceDelivery !== undefined) data.forceDelivery = this.#forceDelivery
    if (this.#provideFeedback !== undefined) data.provideFeedback = this.#provideFeedback
    if (this.#applicationSid) data.applicationSid = this.#applicationSid

    return data
  }
}
