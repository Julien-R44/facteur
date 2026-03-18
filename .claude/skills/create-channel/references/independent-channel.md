# Independent Channel Reference

Template for channels that implement the `Channel` interface directly (like FCM, Expo, Twilio).

## Complete channel.ts Template

```typescript
import type { Awaitable } from '@julr/utils/types'

import { SomeSDK } from 'sdk-package'

import type { XxxConfig, XxxTargets } from './types.js'
import type { XxxMessage } from './message.js'

import {
  kTargetSymbol,
  type BatchConfig,
  type BatchSendResult,
  type Channel,
  type ChannelSendParams,
} from '../../types/index.js'
import { errors } from '../../errors/index.js'

export function xxxChannel(config: XxxConfig) {
  return new XxxChannel(config)
}

export class XxxChannel implements Channel<XxxConfig, XxxMessage, any, XxxTargets> {
  name = 'xxx' as const;
  [kTargetSymbol] = null as any as XxxTargets

  // Only include if batch sending is supported
  batchConfig: BatchConfig = { maxSize: 100, enabled: true }

  #client: SomeSDK
  #config: XxxConfig

  constructor(config: XxxConfig) {
    this.#config = config
    this.#client = new SomeSDK(config)
  }

  #resolveTargets(options: ChannelSendParams<XxxMessage, XxxTargets>): XxxTargets {
    if (options.targets) return options.targets

    throw new errors.E_UNAVAILABLE_TARGETS(['Xxx'])
  }

  #handleError(error: any): never {
    // Add channel-specific error handling
    throw error
  }

  #buildMessage(options: ChannelSendParams<XxxMessage, XxxTargets>) {
    const message = options.message.serialize()
    const targets = this.#resolveTargets(options)

    // Add target info to message based on your API requirements
    return { ...message, to: targets.targetId }
  }

  async send(options: ChannelSendParams<XxxMessage, XxxTargets>) {
    const message = this.#buildMessage(options)
    return await this.#client.send(message).catch((error) => this.#handleError(error))
  }

  // Only include if batch sending is supported
  async sendBatch(messages: ChannelSendParams<XxxMessage, XxxTargets>[]): Promise<BatchSendResult> {
    const builtMessages = messages.map((msg) => this.#buildMessage(msg))
    const response = await this.#client.sendBatch(builtMessages)

    return {
      success: response.successCount,
      failed: response.failureCount,
      results: response.results.map((r, index) => {
        const result: BatchSendResult['results'][number] = {
          index,
          status: r.success ? 'success' : 'failed',
        }

        if (r.error) result.error = new Error(r.error.message, { cause: r.error })
        if (r.id) result.response = r.id

        return result
      }),
    }
  }
}

declare module '@facteurjs/core/types' {
  interface Notification {
    asXxxMessage(): Awaitable<XxxMessage>
  }
}
```

## Complete types.ts Template

```typescript
export interface XxxConfig {
  /**
   * API key for authentication
   */
  apiKey: string

  /**
   * Optional debug mode setting
   */
  debug?: boolean
}

export interface XxxTargets {
  /**
   * Device or user token
   */
  token?: string

  /**
   * Topic name for broadcast
   */
  topic?: string
}
```

## Complete message.ts Template

```typescript
export class XxxMessage {
  #title = ''
  #body = ''
  #data: Record<string, string> = {}
  #imageUrl?: string

  /**
   * Creates a new instance of XxxMessage
   */
  static create() {
    return new XxxMessage()
  }

  /**
   * Sets the notification title
   */
  setTitle(title: string) {
    this.#title = title
    return this
  }

  /**
   * Sets the notification body
   */
  setBody(body: string) {
    this.#body = body
    return this
  }

  /**
   * Sets custom data payload
   */
  setData(data: Record<string, string>) {
    this.#data = data
    return this
  }

  /**
   * Adds a single data key-value pair
   */
  addData(key: string, value: string) {
    this.#data[key] = value
    return this
  }

  /**
   * Sets the notification image URL
   */
  setImageUrl(url: string) {
    this.#imageUrl = url
    return this
  }

  /**
   * Serializes the message to API format
   */
  serialize() {
    const message: any = {}

    if (this.#title) message.title = this.#title
    if (this.#body) message.body = this.#body
    if (Object.keys(this.#data).length > 0) message.data = this.#data
    if (this.#imageUrl) message.imageUrl = this.#imageUrl

    return message
  }
}
```

## Complete index.ts Template

```typescript
export { XxxMessage } from './message.js'
export { xxxChannel, XxxChannel } from './channel.js'
```

## Key Points

1. Factory function is lowercase: `xxxChannel(config)`
2. Class name is PascalCase: `XxxChannel`
3. `name` property uses `as const` for literal type
4. `[kTargetSymbol]` is typed as `null as any as XxxTargets`
5. `#resolveTargets` throws `E_UNAVAILABLE_TARGETS` with channel name in array
6. Optional `batchConfig` and `sendBatch` for batch support
7. Module augmentation MUST be at the end of channel.ts

## BatchSendResult Structure

```typescript
interface BatchSendResult {
  success: number
  failed: number
  results: Array<{
    index: number
    status: 'success' | 'failed'
    error?: Error
    response?: any
  }>
}
```

## Real Example: FCM Channel

Reference implementation: `packages/core/src/channels/fcm/channel.ts`

Key patterns from FCM:
- Uses Firebase Admin SDK
- Supports token, topic, and condition targets
- Has `debugToken` config for development
- Implements batch sending with `sendEach`
