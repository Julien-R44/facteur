import type {
  AndroidConfig,
  ApnsConfig,
  Notification,
  WebpushConfig,
} from 'firebase-admin/messaging'

export class FcmMessage {
  #data: Record<string, string> = {}
  #notification?: Notification
  #android?: AndroidConfig
  #apns?: ApnsConfig
  #webpush?: WebpushConfig
  #token?: string
  #topic?: string
  #condition?: string

  /**
   * Creates a new instance of FcmMessage
   */
  static create() {
    return new FcmMessage()
  }

  /**
   * Sets the target device token
   */
  setToken(token: string) {
    this.#token = token
    return this
  }

  /**
   * Sets the target topic
   */
  setTopic(topic: string) {
    this.#topic = topic
    return this
  }

  /**
   * Sets the target condition
   */
  setCondition(condition: string) {
    this.#condition = condition
    return this
  }

  /**
   * Sets the notification data
   */
  setData(data: Record<string, string>) {
    this.#data = data
    return this
  }

  /**
   * Adds a single data key-value pair
   */
  addData(key: string, value: string) {
    this.#data[key] = value
    return this
  }

  /**
   * Sets the notification options
   */
  setNotification(notification: Notification) {
    this.#notification = notification
    return this
  }

  /**
   * Sets the notification title
   */
  setTitle(title: string) {
    if (!this.#notification) {
      this.#notification = {}
    }
    this.#notification.title = title
    return this
  }

  /**
   * Sets the notification body
   */
  setBody(body: string) {
    if (!this.#notification) {
      this.#notification = {}
    }
    this.#notification.body = body
    return this
  }

  /**
   * Sets the notification image
   */
  setImage(image: string) {
    if (!this.#notification) {
      this.#notification = {}
    }
    this.#notification.imageUrl = image
    return this
  }

  /**
   * Sets Android-specific configuration
   */
  setAndroid(android: AndroidConfig) {
    this.#android = android
    return this
  }

  /**
   * Sets APNs-specific configuration
   */
  setApns(apns: ApnsConfig) {
    this.#apns = apns
    return this
  }

  /**
   * Sets Webpush-specific configuration
   */
  setWebpush(webpush: WebpushConfig) {
    this.#webpush = webpush
    return this
  }

  /**
   * Serializes the message to Firebase format
   */
  serialize() {
    const message: any = {}

    if (this.#token) message.token = this.#token
    if (this.#topic) message.topic = this.#topic
    if (this.#condition) message.condition = this.#condition

    if (Object.keys(this.#data).length > 0) {
      message.data = this.#data
    }

    if (this.#notification) {
      message.notification = this.#notification
    }

    if (this.#android) message.android = this.#android
    if (this.#apns) message.apns = this.#apns
    if (this.#webpush) message.webpush = this.#webpush

    return message
  }
}
