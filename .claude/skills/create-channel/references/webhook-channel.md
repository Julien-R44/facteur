# Webhook-Based Channel Reference

Template for channels that extend `WebhookChannel` (like Slack, Discord).

## Complete channel.ts Template

```typescript
import type { Awaitable } from '@julr/utils/types'

import type { XxxOptions, XxxTargets } from './types.js'
import type { XxxMessage } from './message.js'
import type { WebhookOptions, WebhookTargets } from '../webhook/types.js'
import type { Channel } from '../../types/index.js'

import { WebhookChannel } from '../webhook/provider.js'

export function xxxWebhookChannel<Options extends WebhookOptions<any>>(options: Options) {
  return new XxxWebhookChannel({ name: 'xxx', ...options })
}

type XxxResponse = {}

export class XxxWebhookChannel<T extends XxxOptions<any>>
  extends WebhookChannel<T>
  implements Channel<T, XxxMessage, XxxResponse, XxxTargets<T>>
{
  override name = 'xxx' as any
}

declare module '@facteurjs/core/types' {
  interface Notification {
    asXxxMessage(): Awaitable<XxxMessage>
  }
}
```

## Complete types.ts Template

```typescript
import type { WebhookOptions, WebhookTargets } from '../webhook/types.js'

export type XxxOptions<WebhooksNames extends string> = WebhookOptions<WebhooksNames>
export type XxxTargets<Options extends XxxOptions<any>> = WebhookTargets<Options>

// Optional: Add response type if the API returns structured data
export interface XxxResponse {
  id?: string
  status?: string
}
```

## Complete message.ts Template

```typescript
import { WebhookMessage } from '../webhook/message.js'

export class XxxMessage extends WebhookMessage {
  #text = ''
  #username = ''
  #iconUrl = ''

  /**
   * Creates a new instance of XxxMessage
   */
  static override create() {
    return new XxxMessage()
  }

  /**
   * Sets the message text
   */
  setText(text: string) {
    this.#text = text
    return this
  }

  /**
   * Sets the bot username
   */
  setUsername(username: string) {
    this.#username = username
    return this
  }

  /**
   * Sets the bot icon URL
   */
  setIconUrl(url: string) {
    this.#iconUrl = url
    return this
  }

  override serialize() {
    const body: any = {
      text: this.#text,
    }

    if (this.#username) body.username = this.#username
    if (this.#iconUrl) body.icon_url = this.#iconUrl

    return { ...super.serialize(), body }
  }
}
```

## Complete index.ts Template

```typescript
export { XxxMessage } from './message.js'
export { xxxWebhookChannel, XxxWebhookChannel } from './channel.js'
```

## Key Points

1. Factory function includes "Webhook": `xxxWebhookChannel`
2. Class extends `WebhookChannel<T>`
3. Uses `WebhookOptions` and `WebhookTargets` type aliases from `../webhook/types.js`
4. Message class extends `WebhookMessage` from `../webhook/message.js`
5. Override `serialize()` and call `super.serialize()` to inherit base properties
6. `name` property uses `as any` type assertion (not `as const`)
7. Response type is optional - use empty object `{}` if not needed

## WebhookMessage Base Class

The `WebhookMessage` base class provides:

```typescript
class WebhookMessage {
  #body: any
  #headers: Record<string, string> = {}
  #queryParameters: Record<string, string> = {}

  static create() { return new WebhookMessage() }

  setBody(body: any) { ... return this }
  setHeader(name: string, value: string) { ... return this }
  setQueryParameters(params: Record<string, string>) { ... return this }

  serialize() {
    return {
      body: this.#body,
      headers: this.#headers,
      queryParameters: this.#queryParameters,
    }
  }
}
```

Your message class inherits these methods and can add channel-specific ones.

## WebhookOptions Pattern

The webhook system supports two configuration patterns:

```typescript
// Single webhook URL
const channel = xxxWebhookChannel({
  webhookUrl: 'https://hooks.example.com/xxx'
})

// Multiple named webhooks
const channel = xxxWebhookChannel({
  webhooks: {
    alerts: 'https://hooks.example.com/alerts',
    notifications: 'https://hooks.example.com/notifications'
  }
})
```

## Real Example: Slack Channel

Reference implementation: `packages/core/src/channels/slack/`

Key patterns from Slack:
- Extends `WebhookChannel` for HTTP posting
- `SlackMessage` extends `WebhookMessage`
- Rich message building with blocks (sections, headers, dividers)
- Override `serialize()` calls `super.serialize()` and adds `body`
