export class WebhookMessage {
  #body: any
  #headers: Record<string, string> = {}
  #queryParameters: Record<string, string> = {}

  static create() {
    return new WebhookMessage()
  }

  /**
   * Set the data for the webhook message
   */
  setBody(body: any) {
    this.#body = body
    return this
  }

  /**
   * Set a header for the webhook message
   */
  setHeader(name: string, value: string) {
    this.#headers[name] = value
    return this
  }

  /**
   * Set query parameters that will be appended to the webhook URL
   */
  setQueryParameters(params: Record<string, string>) {
    this.#queryParameters = params
    return this
  }

  serialize() {
    return {
      body: this.#body,
      headers: this.#headers,
      queryParameters: this.#queryParameters,
    }
  }
}
