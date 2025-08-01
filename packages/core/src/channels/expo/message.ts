import type { ExpoPushMessage } from 'expo-server-sdk'

/**
 * Expo push notification message
 */
export class ExpoMessage {
  #title?: string
  #body?: string
  #data?: any
  #sound?: string
  #badge?: number
  #channelId?: string
  #categoryId?: string
  #subtitle?: string
  #priority: 'default' | 'normal' | 'high' = 'default'
  #ttl?: number
  #expiration?: number
  #mutableContent?: boolean

  /**
   * Creates a new instance of ExpoMessage
   */
  static create() {
    return new ExpoMessage()
  }

  /**
   * Set the notification title
   */
  setTitle(title: string): this {
    this.#title = title
    return this
  }

  /**
   * Set the notification body
   */
  setBody(body: string): this {
    this.#body = body
    return this
  }

  /**
   * Set additional data payload
   */
  setData(data: any): this {
    this.#data = data
    return this
  }

  /**
   * Set the sound to play. Use 'default' for default sound
   */
  setSound(sound: string): this {
    this.#sound = sound
    return this
  }

  /**
   * Set the badge number for iOS
   */
  setBadge(badge: number): this {
    this.#badge = badge
    return this
  }

  /**
   * Set the notification channel ID for Android
   */
  setChannelId(channelId: string): this {
    this.#channelId = channelId
    return this
  }

  /**
   * Set the notification category ID
   */
  setCategoryId(categoryId: string): this {
    this.#categoryId = categoryId
    return this
  }

  /**
   * Set the subtitle (iOS only)
   */
  setSubtitle(subtitle: string): this {
    this.#subtitle = subtitle
    return this
  }

  /**
   * Set the delivery priority
   */
  setPriority(priority: 'default' | 'normal' | 'high'): this {
    this.#priority = priority
    return this
  }

  /**
   * Set time to live in seconds
   */
  setTtl(ttl: number): this {
    this.#ttl = ttl
    return this
  }

  /**
   * Set expiration timestamp
   */
  setExpiration(expiration: number): this {
    this.#expiration = expiration
    return this
  }

  /**
   * Set whether notification can be intercepted by client app (iOS only)
   */
  setMutableContent(mutableContent: boolean): this {
    this.#mutableContent = mutableContent
    return this
  }

  /**
   * Serialize the message to Expo format
   */
  serialize(options: { to: string }): ExpoPushMessage {
    const message: ExpoPushMessage = { to: options.to }

    if (this.#title) message.title = this.#title
    if (this.#body) message.body = this.#body
    if (this.#data !== undefined) message.data = this.#data
    if (this.#sound) message.sound = this.#sound
    if (this.#badge !== undefined) message.badge = this.#badge
    if (this.#channelId) message.channelId = this.#channelId
    if (this.#categoryId) message.categoryId = this.#categoryId
    if (this.#subtitle) message.subtitle = this.#subtitle
    if (this.#priority !== 'default') message.priority = this.#priority
    if (this.#ttl !== undefined) message.ttl = this.#ttl
    if (this.#expiration !== undefined) message.expiration = this.#expiration
    if (this.#mutableContent !== undefined) message.mutableContent = this.#mutableContent

    return message
  }
}
