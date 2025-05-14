import { WebhookProvider } from '@facteurjs/webhook'
import type { Provider } from '@facteurjs/core/types'
import type { WebhookOptions, WebhookTargets } from '@facteurjs/webhook/types'

import type { DiscordResponse } from './types.js'
import type { DiscordMessage } from './message.js'

export function discordWebhookProvider<Options extends WebhookOptions<any>>(options: Options) {
  return new DiscordProvider({ name: 'discord', ...options })
}

class DiscordProvider<T extends WebhookOptions<any>>
  extends WebhookProvider<T>
  implements Provider<T, DiscordMessage, DiscordResponse, WebhookTargets<T>>
{
  name = 'discord' as const
}

declare module '@facteurjs/core/types' {
  interface Notification {
    toDiscord(): DiscordMessage
  }
}
