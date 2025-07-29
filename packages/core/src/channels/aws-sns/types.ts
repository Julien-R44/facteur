/**
 * Configuration for AWS SNS SMS channel
 */
export interface AwsSnsConfig {
  region: string
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
}

/**
 * SMS message data for AWS SNS
 */
export interface AwsSnsSmsData {
  to: string
  content: string
}

/**
 * AWS SNS targets
 */
export interface AwsSnsTargets {
  to: string
}

export interface AwsSnsTargets {
  /**
   * The phone number to send the SMS to (in E.164 format)
   */
  to: string

  /**
   * Override the sender ID for this specific message
   */
  senderId?: string
}
