import { createHmac, randomUUID } from 'node:crypto'
import { createError } from '@poppinss/exception'

/**
 * Thrown when `httpsOnly` is enabled and a target URL is not https
 */
export const E_WEBHOOK_INSECURE_URL = createError<[protocol: string]>(
  'Refusing to send a webhook to a non-https URL (protocol "%s") because "httpsOnly" is enabled',
  'E_WEBHOOK_INSECURE_URL',
  500,
)

/**
 * Thrown when a signing secret is not a valid Standard Webhooks secret
 */
export const E_INVALID_WEBHOOK_SECRET = createError(
  'Invalid webhook signing secret. Expected a Standard Webhooks secret: "whsec_" followed by base64',
  'E_INVALID_WEBHOOK_SECRET',
  500,
)

const SECRET_PREFIX = 'whsec_'
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/

/**
 * Decode a Standard Webhooks secret. The `whsec_` prefix is optional,
 * like in the reference implementations.
 */
export function decodeSigningSecret(secret: string) {
  const encoded = secret.startsWith(SECRET_PREFIX) ? secret.slice(SECRET_PREFIX.length) : secret
  if (!BASE64_PATTERN.test(encoded)) throw new E_INVALID_WEBHOOK_SECRET()

  return Buffer.from(encoded, 'base64')
}

export function generateWebhookId() {
  return `msg_${randomUUID()}`
}

/**
 * Build the Standard Webhooks headers for a payload
 */
export function signWebhookPayload(options: {
  key: Buffer
  id: string
  timestamp: number
  payload: string
}) {
  const { key, id, timestamp, payload } = options
  const signature = createHmac('sha256', key)
    .update(`${id}.${timestamp}.${payload}`)
    .digest('base64')

  return {
    'webhook-id': id,
    'webhook-timestamp': String(timestamp),
    'webhook-signature': `v1,${signature}`,
  }
}
