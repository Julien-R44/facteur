export interface WebpushConfig {
  /**
   * VAPID subject (mailto: or https:// URL)
   */
  vapidSubject: string

  /**
   * VAPID public key (URL Safe Base64 encoded)
   */
  vapidPublicKey: string

  /**
   * VAPID private key (URL Safe Base64 encoded)
   */
  vapidPrivateKey: string

  /**
   * GCM API Key (optional, for legacy support)
   */
  gcmApiKey?: string

  /**
   * Default TTL in seconds (default: 4 weeks)
   */
  ttl?: number

  /**
   * Default urgency level
   */
  urgency?: 'very-low' | 'low' | 'normal' | 'high'

  /**
   * HTTP proxy configuration
   */
  proxy?: string

  /**
   * Request timeout in milliseconds
   */
  timeout?: number
}

export interface WebpushTargets {
  /**
   * Push subscription object from the browser
   */
  subscription: {
    endpoint: string
    keys: { p256dh: string; auth: string }
    expirationTime?: number | null
  }
}
