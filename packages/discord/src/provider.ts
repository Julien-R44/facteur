import type { Awaitable } from '@julr/utils/types'
import { WebhookProvider } from '@facteurjs/webhook'
import type { Provider, ProvidersToTargets } from '@facteurjs/core/types'

import type { DiscordMessage } from './message.js'
import type { DiscordOptions, DiscordResponse, DiscordTargets } from './types.js'

export function discordWebhookProvider<Options extends DiscordOptions<any>>(options: Options) {
  return new DiscordProvider(options)
}

// Type pour stocker l'information du type Target
type GetTargets<T> = T extends Provider<any, any, any, infer U> ? U : never

// Définir l'interface Discord avec le type Target voulu
interface DiscordProviderInterface<Options extends DiscordOptions<any>>
  extends Provider<Options, DiscordMessage, DiscordResponse, { yes: true }> {}

// Implémenter la classe sans la propriété targets
class DiscordProvider<Options extends DiscordOptions<any>>
  implements DiscordProviderInterface<Options>
{
  send(options: { notifiable: any; message: DiscordMessage }) {
    return null as any
  }
}

// Extraire le type directement à partir du type, pas de l'instance
// type Targets = GetTargets<DiscordProviderInterface<{ webhookUrl: string }>>

type ExtractTargetsType<T> =
  T extends Provider<infer _O, infer _M, infer _R, infer Targets> ? Targets : never

// Utiliser le type auxiliaire directement sur l'interface, pas sur la classe
type Targets = ExtractTargetsType<DiscordProviderInterface<{ webhookUrl: string }>>
