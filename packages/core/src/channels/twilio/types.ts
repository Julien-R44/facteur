export interface TwilioConfig {
  /**
   * Twilio Account SID
   */
  accountSid: string

  /**
   * Twilio Auth Token
   */
  authToken: string

  /**
   * Default phone number to send messages from
   */
  from?: string

  /**
   * Messaging Service SID (recommended by Twilio)
   */
  messagingServiceSid?: string

  /**
   * Alphanumeric sender (for supported regions)
   */
  alphanumericSender?: string

  /**
   * Maximum price per message in USD
   */
  maxPrice?: number

  /**
   * Debug mode - redirect all messages to this number
   */
  debugTo?: string

  /**
   * Enable URL shortening
   */
  shortenUrls?: boolean

  /**
   * Twilio error codes to ignore
   */
  ignoredErrorCodes?: (string | number)[]
}

export interface TwilioTargets {
  /**
   * The phone number to send the message to
   */
  to: string

  /**
   * Override the from number for this specific message
   */
  from?: string
}
