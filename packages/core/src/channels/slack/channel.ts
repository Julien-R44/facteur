import type { Awaitable } from '@julr/utils/types'

import type { SlackOptions, SlackTargets } from './types.ts'
import type { SlackMessage } from './message.ts'
import type { Channel } from '../../types/index.ts'

import { WebhookChannel } from '../webhook/provider.ts'

export function slackWebhookChannel<Options extends SlackOptions<any>>(options: Options) {
  return new SlackWebhookChannel({ name: 'slack', ...options })
}

type SlackResponse = {}
export class SlackWebhookChannel<T extends SlackOptions<any>>
  extends WebhookChannel<T>
  implements Channel<T, SlackMessage, SlackResponse, SlackTargets<T>>
{
  override name = 'slack' as any
}

declare module '@facteurjs/core/types' {
  interface Notification {
    asSlackMessage(): Awaitable<SlackMessage>
  }
}
