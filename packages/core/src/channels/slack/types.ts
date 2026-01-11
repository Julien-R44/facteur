import type { WebhookOptions, WebhookTargets } from '../webhook/types.ts'

export type SlackOptions<WebhooksNames extends string> = WebhookOptions<WebhooksNames>
export type SlackTargets<Options extends SlackOptions<any>> = WebhookTargets<Options>
