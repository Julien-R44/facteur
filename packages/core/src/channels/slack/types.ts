import type { WebhookOptions, WebhookTargets } from '../webhook/types.js'

export type SlackOptions<WebhooksNames extends string> = WebhookOptions<WebhooksNames>
export type SlackTargets<Options extends SlackOptions<any>> = WebhookTargets<Options>
