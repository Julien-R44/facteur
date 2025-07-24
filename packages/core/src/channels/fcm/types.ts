import type { AppOptions } from 'firebase-admin'

export interface FcmConfig extends AppOptions {
  /**
   * Debug mode - redirect all messages to this token
   */
  debugToken?: string

  /**
   * Path to the service account key file
   */
  serviceAccountKeyPath?: string
}

export interface FcmTargets {
  /**
   * Device registration token
   */
  token?: string

  /**
   * Topic name to send to
   */
  topic?: string

  /**
   * Condition for targeting multiple topics/tokens
   */
  condition?: string
}
