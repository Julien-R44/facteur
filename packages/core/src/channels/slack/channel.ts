import type { SlackOptions, SlackTargets } from './types.js'
import type { SlackMessage } from './message.js'
import type { Channel } from '../../types/index.js'

import { WebhookChannel } from '../webhook/provider.js'

export function slackWebhookChannel<Options extends SlackOptions<any>>(options: Options) {
  return new SlackWebhookChannel({ name: 'slack', ...options })
}

type SlackResponse = {}
class SlackWebhookChannel<T extends SlackOptions<any>>
  extends WebhookChannel<T>
  implements Channel<T, SlackMessage, SlackResponse, SlackTargets<T>>
{
  override name = 'slack' as any
}

declare module '@facteurjs/core/types' {
  interface Notification {
    asSlackMessage(): SlackMessage
  }
}
