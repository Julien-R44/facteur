import type { Channel } from '@facteurjs/core/types'

import type { SlackMessage } from './message.js'
import { WebhookChannel } from '../webhook/provider.js'
import type { SlackOptions, SlackTargets } from './types.js'

export function slackWebhookChannel<Options extends SlackOptions<any>>(options: Options) {
  return new SlackWebhookChannel({ name: 'slack', ...options })
}

type SlackResponse = {}
export class SlackWebhookChannel<T extends SlackOptions<any>>
  extends WebhookChannel<T>
  implements Channel<T, SlackMessage, SlackResponse, SlackTargets<T>>
{
  name = 'slack' as const
}

declare module '@facteurjs/core/types' {
  interface Notification<
    N extends Notifiable = Notifiable,
    Params extends Record<string, any> = any,
  > {
    asSlackMessage(ctx: MessageCtx<N, Params>): SlackMessage
  }
}
