import type { Awaitable } from '@julr/utils/types'

import type { Identifier } from '../database/types.js'

export type ChannelSendParams<Message, Targets> = {
  to?: any
  message: Message
  targets?: Targets
  tenantId?: Identifier | undefined
}

export const kTargetSymbol = Symbol('facteur:targets')
export interface Channel<_Options = any, Message = any, Response = any, Targets = any> {
  [kTargetSymbol]: Targets
  name: string
  send: (options: ChannelSendParams<Message, Targets>) => Awaitable<Response>
}
