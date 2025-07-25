import type { HTTPErrorInfo } from '../../errors/http_error.js'

/**
 * Exception thrown when a webhook request fails
 */
export class WebhookRequestException extends Error {
  declare code: string
  declare url: string
  declare responseBody: string

  constructor(httpErrorInfo: HTTPErrorInfo) {
    const { url, status, statusText, responseBody } = httpErrorInfo

    const message = [
      `\n- Webhook request failed to ${url}`,
      `- Status: ${status} ${statusText}`,
      `- Response body:`,
      responseBody,
    ].join('\n')

    super(message)

    this.name = 'WebhookRequestException'
    this.code = 'E_WEBHOOK_REQUEST_FAILED'
    this.url = url
    this.responseBody = responseBody
  }
}

export const errors = {
  E_WEBHOOK_REQUEST_FAILED: WebhookRequestException,
}
