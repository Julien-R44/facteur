import type { Channel, MessageCtx, Notifiable } from '../../types/index.js'

import type { DiscordResponse } from './types.js'
import type { DiscordMessage } from './message.js'
import { WebhookChannel } from '../webhook/provider.js'
import type { WebhookOptions, WebhookTargets } from '../webhook/types.js'

export function discordWebhookChannel<Options extends WebhookOptions<any>>(options: Options) {
  return new DiscordProvider({ name: 'discord', ...options })
}

class DiscordProvider<T extends WebhookOptions<any>>
  extends WebhookChannel<T>
  implements Channel<T, DiscordMessage, DiscordResponse, WebhookTargets<T>>
{
  override name = 'discord' as any
}

declare module '@facteurjs/core/types' {
  interface Notification<
    N extends Notifiable | undefined = Notifiable | undefined,
    Params extends Record<string, any> = any,
  > {
    asDiscordMessage(ctx: MessageCtx<N, Params>): DiscordMessage
  }
}
