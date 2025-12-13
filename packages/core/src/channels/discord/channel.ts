import type { DiscordResponse } from './types.js'
import type { DiscordMessage } from './message.js'
import type { WebhookOptions, WebhookTargets } from '../webhook/types.js'
import type { Channel } from '../../types/index.js'

import { WebhookChannel } from '../webhook/provider.js'

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
