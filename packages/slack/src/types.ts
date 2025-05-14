import type { WebhookOptions, WebhookTargets } from '@facteurjs/webhook/types'

export type SlackOptions<WebhooksNames extends string> = WebhookOptions<WebhooksNames>
export type SlackTargets<Options extends SlackOptions<any>> = WebhookTargets<Options>
