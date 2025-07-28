import { kTargetSymbol, type Channel, type ChannelSendParams } from '../../types/index.js'

import type { TransmitMessage } from './message.js'
import type { TransmitConfig, TransmitTargets } from './types.js'
import { errors } from '../../errors/index.js'

export function transmitChannel(config: TransmitConfig) {
  return new TransmitChannel(config)
}

export class TransmitChannel
  implements Channel<TransmitConfig, TransmitMessage, any, TransmitTargets>
{
  name = 'transmit' as const;
  [kTargetSymbol] = null as any as TransmitTargets

  constructor(private config: TransmitConfig) {}

  #resolveTargets(options: ChannelSendParams<TransmitMessage, TransmitTargets>): TransmitTargets {
    if (options.targets) return options.targets

    throw new errors.E_UNAVAILABLE_TARGETS(['Transmit'])
  }

  async send(options: ChannelSendParams<TransmitMessage, TransmitTargets>) {
    const message = options.message.serialize()
    const targets = this.#resolveTargets(options)

    this.config.transmit.broadcast(targets.channel, message.content)
  }
}

declare module '@facteurjs/core/types' {
  interface Notification {
    asTransmitMessage(): TransmitMessage
  }
}
