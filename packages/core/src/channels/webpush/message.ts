export class WebpushMessage {
  #title?: string
  #body?: string
  #icon?: string
  #image?: string
  #badge?: string
  #tag?: string
  #data?: any
  #actions?: Array<{ action: string; title: string; icon?: string }>
  #url?: string
  #requireInteraction?: boolean
  #silent?: boolean
  #renotify?: boolean
  #timestamp?: number
  #vibrate?: number[]
  #dir?: 'auto' | 'ltr' | 'rtl'
  #lang?: string

  /**
   * Creates a new instance of WebpushMessage
   */
  static create() {
    return new WebpushMessage()
  }

  /**
   * Sets the notification title
   */
  setTitle(title: string) {
    this.#title = title
    return this
  }

  /**
   * Sets the notification body
   */
  setBody(body: string) {
    this.#body = body
    return this
  }

  /**
   * Sets the notification icon
   */
  setIcon(icon: string) {
    this.#icon = icon
    return this
  }

  /**
   * Sets the notification image
   */
  setImage(image: string) {
    this.#image = image
    return this
  }

  /**
   * Sets the notification badge
   */
  setBadge(badge: string) {
    this.#badge = badge
    return this
  }

  /**
   * Sets the notification tag
   */
  setTag(tag: string) {
    this.#tag = tag
    return this
  }

  /**
   * Sets the notification data
   */
  setData(data: any) {
    this.#data = data
    return this
  }

  /**
   * Sets the notification actions
   */
  setActions(actions: Array<{ action: string; title: string; icon?: string }>) {
    this.#actions = actions
    return this
  }

  /**
   * Adds a single action
   */
  addAction(options: { action: string; title: string; icon?: string }) {
    if (!this.#actions) {
      this.#actions = []
    }
    this.#actions.push(options)
    return this
  }

  /**
   * Sets the URL to open when notification is clicked
   */
  setUrl(url: string) {
    this.#url = url
    return this
  }

  /**
   * Sets whether the notification requires interaction
   */
  setRequireInteraction(requireInteraction: boolean) {
    this.#requireInteraction = requireInteraction
    return this
  }

  /**
   * Sets whether the notification should be silent
   */
  setSilent(silent: boolean) {
    this.#silent = silent
    return this
  }

  /**
   * Sets whether to renotify when replacing an existing notification
   */
  setRenotify(renotify: boolean) {
    this.#renotify = renotify
    return this
  }

  /**
   * Sets the notification timestamp
   */
  setTimestamp(timestamp: number) {
    this.#timestamp = timestamp
    return this
  }

  /**
   * Sets the vibration pattern
   */
  setVibrate(vibrate: number[]) {
    this.#vibrate = vibrate
    return this
  }

  /**
   * Sets the text direction
   */
  setDir(dir: 'auto' | 'ltr' | 'rtl') {
    this.#dir = dir
    return this
  }

  /**
   * Sets the notification language
   */
  setLang(lang: string) {
    this.#lang = lang
    return this
  }

  /**
   * Serializes the message to web push format
   */
  serialize() {
    const notification: any = {}

    if (this.#title) notification.title = this.#title
    if (this.#body) notification.body = this.#body
    if (this.#icon) notification.icon = this.#icon
    if (this.#image) notification.image = this.#image
    if (this.#badge) notification.badge = this.#badge
    if (this.#tag) notification.tag = this.#tag
    if (this.#data !== undefined) notification.data = this.#data
    if (this.#actions) notification.actions = this.#actions
    if (this.#url) notification.data = { ...notification.data, url: this.#url }
    if (this.#requireInteraction !== undefined)
      notification.requireInteraction = this.#requireInteraction
    if (this.#silent !== undefined) notification.silent = this.#silent
    if (this.#renotify !== undefined) notification.renotify = this.#renotify
    if (this.#timestamp !== undefined) notification.timestamp = this.#timestamp
    if (this.#vibrate) notification.vibrate = this.#vibrate
    if (this.#dir) notification.dir = this.#dir
    if (this.#lang) notification.lang = this.#lang

    return JSON.stringify(notification)
  }
}
