import type { Awaitable } from '@julr/utils/types'

import type { Identifier } from '../database/types.ts'

export type ChannelSendParams<Message, Targets> = {
  to?: any
  message: Message
  targets?: Targets
  tenantId?: Identifier | undefined
}

/**
 * Result of a batch send operation
 */
export interface BatchSendResult {
  success: number
  failed: number
  results: Array<{
    index: number
    status: 'success' | 'failed'
    error?: Error
    response?: any
  }>
}

/**
 * Configuration for batch sending capabilities
 */
export interface BatchConfig {
  /**
   * Maximum number of messages per batch API call.
   * E.g. 500 for FCM, 100 for Expo
   */
  maxSize: number

  /**
   * Whether batching is enabled for this channel.
   * @default true
   */
  enabled?: boolean
}

export const kTargetSymbol = Symbol('facteur:targets')
export interface Channel<_Options = any, Message = any, Response = any, Targets = any> {
  [kTargetSymbol]: Targets
  name: string
  send: (options: ChannelSendParams<Message, Targets>) => Awaitable<Response>

  /**
   * Optional batch send method for providers that support sending multiple messages in one API call.
   * When implemented, the orchestration layer will group messages and use this method.
   */
  sendBatch?: (messages: ChannelSendParams<Message, Targets>[]) => Awaitable<BatchSendResult>

  /**
   * Configuration for batch sending.
   * Required when sendBatch is implemented.
   */
  batchConfig?: BatchConfig
}
