/**
 * Generic HTTP error interface that can be implemented by any HTTP library error
 */
export interface GenericHTTPError {
  request: Request
  response: Response
}

/**
 * Represents an HTTP error with decoded response body
 */
export interface HTTPErrorInfo {
  url: string
  status: number
  statusText: string
  responseBody: string
}

/**
 * Extracts information from an HTTPError with async response body decoding
 */
export class HTTPErrorExtractor {
  /**
   * Extracts HTTP error information with properly decoded response body
   */
  static async extract(httpError: GenericHTTPError): Promise<HTTPErrorInfo> {
    const url = httpError.request.url
    const status = httpError.response.status
    const statusText = httpError.response.statusText

    let responseBody: string
    try {
      const jsonBody = await httpError.response.clone().json()
      responseBody = JSON.stringify(jsonBody, null, 2)
    } catch {
      responseBody = await httpError.response.text()
    }

    return { url, status, statusText, responseBody }
  }
}
