import { WebhookProvider } from '@facteurjs/webhook'
import type { Channel } from '@facteurjs/core/types'
import type { WebhookOptions, WebhookTargets } from '@facteurjs/webhook/types'

import type { DiscordResponse } from './types.js'
import type { DiscordMessage } from './message.js'

export function discordWebhookChannel<Options extends WebhookOptions<any>>(options: Options) {
  return new DiscordProvider({ name: 'discord', ...options })
}

class DiscordProvider<T extends WebhookOptions<any>>
  extends WebhookProvider<T>
  implements Channel<T, DiscordMessage, DiscordResponse, WebhookTargets<T>>
{
  name = 'discord' as const
}

declare module '@facteurjs/core/types' {
  interface Notification<Notifiable> {
    toDiscord(): DiscordMessage
  }
}
