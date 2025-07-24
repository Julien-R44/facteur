import { invoke } from '@julr/utils/functions'
import { kTargetSymbol, type Channel, type ChannelSendParams } from '@facteurjs/core/types'

import type { TransmitMessage } from './message.js'
import type { TransmitConfig, TransmitTargets } from './types.js'

export function transmitChannel(config: TransmitConfig) {
  return new TransmitChannel(config)
}

export class TransmitChannel
  implements Channel<TransmitConfig, TransmitMessage, any, TransmitTargets>
{
  name = 'transmit' as const;
  [kTargetSymbol] = null as any as TransmitTargets

  constructor(private config: TransmitConfig) {}

  async send(options: ChannelSendParams<TransmitMessage, TransmitTargets>) {
    const message = options.message.serialize()
    const targets = invoke<TransmitTargets>(() => {
      if (options.notifiable?.[`notificationTargetForTransmit`]) {
        return options.notifiable.notificationTargetForTransmit()
      }

      if (!options.notifiable.id) throw new Error('No notifiable ID provided')

      return options.targets || `users/${options.notifiable.id}`
    })

    this.config.transmit.broadcast(targets.channel, message.content)
  }
}

declare module '@facteurjs/core/types' {
  interface Notification<
    N extends Notifiable = Notifiable,
    Params extends Record<string, any> = any,
  > {
    asTransmitMessage(ctx: MessageCtx<N, Params>): TransmitMessage
  }
}
