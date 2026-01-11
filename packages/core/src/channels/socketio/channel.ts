import type { Server as SocketIOServer } from 'socket.io'

import type { SocketIOConfig, SocketIOTargets } from './types.ts'
import type { SocketIoMessage } from './message.ts'

import { kTargetSymbol, type Channel, type ChannelSendParams } from '../../types/index.ts'
import { errors } from '../../errors/index.ts'

export function socketIoChannel(config: SocketIOConfig) {
  return new SocketIOChannel(config)
}

export class SocketIOChannel implements Channel<
  SocketIOConfig,
  SocketIoMessage,
  any,
  SocketIOTargets
> {
  name = 'socketIo' as const;
  [kTargetSymbol] = null as any as SocketIOTargets
  protected server: () => SocketIOServer

  constructor(private config: SocketIOConfig) {
    this.server =
      typeof this.config.server === 'function'
        ? this.config.server
        : () => this.config.server as SocketIOServer
  }

  #resolveTargets(options: ChannelSendParams<SocketIoMessage, SocketIOTargets>): SocketIOTargets {
    if (options.targets) return options.targets

    throw new errors.E_UNAVAILABLE_TARGETS(['SocketIO'])
  }

  async send(options: ChannelSendParams<SocketIoMessage, SocketIOTargets>) {
    const message = options.message.serialize()
    const targets = this.#resolveTargets(options)

    this.server()
      .of(targets.namespace || '/')
      .emit(targets.event, message.data)
  }
}

declare module '@facteurjs/core/types' {
  interface Notification {
    asSocketIoMessage(): SocketIoMessage
  }
}
