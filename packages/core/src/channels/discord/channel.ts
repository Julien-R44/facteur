import type { DiscordResponse } from './types.ts'
import type { DiscordMessage } from './message.ts'
import type { WebhookOptions, WebhookTargets } from '../webhook/types.ts'
import type { Channel } from '../../types/index.ts'

import { WebhookChannel } from '../webhook/provider.ts'

export function discordWebhookChannel<Options extends WebhookOptions<any>>(options: Options) {
  return new DiscordProvider({ name: 'discord', ...options })
}

export class DiscordProvider<T extends WebhookOptions<any>>
  extends WebhookChannel<T>
  implements Channel<T, DiscordMessage, DiscordResponse, WebhookTargets<T>>
{
  override name = 'discord' as any
}

declare module '@facteurjs/core/types' {
  interface Notification {
    asDiscordMessage(): DiscordMessage
  }
}
