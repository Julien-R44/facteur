/**
 * HTTP options shared by the webhook channel and the channels built on it
 * (Slack, Discord). Every option is opt-in: omitting them keeps the default
 * behavior of previous versions.
 */
export interface WebhookRequestOptions {
  /**
   * Standard Webhooks secret (`whsec_<base64>`) used to sign every request
   * with the `webhook-id`, `webhook-timestamp` and `webhook-signature` headers.
   * Can be overridden per send with the `signingSecret` target.
   *
   * @see https://www.standardwebhooks.com
   */
  signingSecret?: string

  /**
   * Reject non-https URLs before any request is made.
   *
   * @default false
   */
  httpsOnly?: boolean

  /**
   * Follow HTTP redirects. When `false`, a 3xx response is not followed and
   * fails the send like any other non-2xx response.
   *
   * @default true
   */
  followRedirects?: boolean

  /**
   * Request timeout in milliseconds, or `false` to disable it.
   *
   * @default 10000
   */
  timeout?: number | false

  /**
   * Custom `fetch` implementation used for every request. Useful to plug a
   * fetch that guards against SSRF (DNS resolution checked against private
   * ranges and connection pinned to the checked IP).
   */
  fetch?: typeof globalThis.fetch
}

export type WebhookOptions<WebhookNames extends string> = WebhookRequestOptions &
  ({ webhookUrl: string } | { webhooks: Record<WebhookNames, string> })

/**
 * Per-send options accepted next to the targets
 */
export interface WebhookTargetOptions {
  /**
   * Standard Webhooks secret used for this send, overriding the channel `signingSecret`
   */
  signingSecret?: string
}

export type WebhookTargets<Options extends WebhookOptions<any>> = (Options extends {
  webhooks: infer Webhooks
}
  ? { [key in keyof Webhooks]?: boolean } & { webhookUrl?: string }
  : { webhookUrl: string }) &
  WebhookTargetOptions
