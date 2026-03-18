---
name: create-channel
description: Generate a new notification channel for the Facteur project. Use this skill when the user wants to create, add, or implement a new channel provider for sending notifications (e.g., push notifications, SMS, webhooks, messaging platforms like Telegram, SendGrid, OneSignal, etc.). This skill generates the 4 required files (channel.ts, types.ts, message.ts, index.ts) plus a test file following the project's established patterns.
---

# Create Channel Skill

Generate notification channels for the Facteur notification system.

## Overview

Each channel in Facteur consists of 4 files in `packages/core/src/channels/{channel-name}/`:
- `channel.ts` - Channel class implementing the `Channel` interface + factory function
- `types.ts` - TypeScript interfaces (Config, Targets, optional Response)
- `message.ts` - Message class with fluent API and `serialize()` method
- `index.ts` - Re-exports from other files

There are two channel types:
1. **Independent channels** - Implement `Channel` interface directly (like FCM, Expo, Twilio)
2. **Webhook-based channels** - Extend `WebhookChannel` (like Slack, Discord)

## Before Starting

Ask the user:
1. **Channel name** (e.g., "telegram", "sendgrid", "onesignal")
2. **Channel type**: independent or webhook-based
3. **If independent**: which SDK/API will be used
4. **Target types** needed (token, phone number, email, topic, etc.)
5. **Batch sending support** needed?

## File Generation Order

Generate files in this order:
1. `types.ts` - Define Config and Targets interfaces first
2. `message.ts` - Create the Message class with fluent API
3. `channel.ts` - Implement the channel class
4. `index.ts` - Export everything
5. `{channel-name}.spec.ts` - Generate tests in `packages/core/tests/`

## Code Style Requirements

CRITICAL - Follow these conventions strictly:

1. **Private members**: Always use `#` syntax for private class properties and methods
2. **Class member order**:
   - Properties (including `name`, `[kTargetSymbol]`, `batchConfig` if applicable)
   - Constructor
   - Private methods (prefixed with `#`)
   - Public methods
3. **Early return pattern**: Prefer early returns over nested conditions
4. **Single-line conditions**: Use `if (condition) return value` when possible
5. **JSDoc**: Provide concise descriptions without `@param` or `@returns` annotations
6. **Imports**: Use `.js` extension for local imports
7. **POJO for 2+ params**: Functions with 2+ parameters should accept an options object

## Independent Channel Template

See `references/independent-channel.md` for the complete template including:
- Channel class structure with `Channel` interface implementation
- Factory function pattern (`xxxChannel(config)`)
- Target resolution with `#resolveTargets` method
- Module augmentation for `as{ChannelName}Message()` declaration
- Optional batch sending support with `sendBatch` and `batchConfig`

## Webhook-Based Channel Template

See `references/webhook-channel.md` for the complete template including:
- Extending `WebhookChannel<T>` from `../webhook/provider.js`
- Using `WebhookOptions` and `WebhookTargets` type aliases
- Extending `WebhookMessage` for the message class
- Simplified channel implementation with inherited send logic

## Message Class Pattern

Message classes follow a fluent API pattern:

```typescript
export class XxxMessage {
  #property1 = ''
  #property2?: SomeType

  /**
   * Creates a new instance of XxxMessage
   */
  static create() {
    return new XxxMessage()
  }

  /**
   * Sets property1
   */
  setProperty1(value: string) {
    this.#property1 = value
    return this
  }

  /**
   * Serializes the message to API format
   */
  serialize() {
    const data: any = {}
    if (this.#property1) data.property1 = this.#property1
    if (this.#property2) data.property2 = this.#property2
    return data
  }
}
```

## Types File Pattern

```typescript
// For independent channel
export interface XxxConfig {
  /**
   * Description of this config option
   */
  requiredOption: string

  /**
   * Optional config with JSDoc
   */
  optionalOption?: string
}

export interface XxxTargets {
  /**
   * The primary target identifier
   */
  targetId?: string

  /**
   * Optional alternative target
   */
  alternativeTarget?: string
}
```

## Index File Pattern

```typescript
export { XxxMessage } from './message.js'
export { xxxChannel, XxxChannel } from './channel.js'
```

## Module Augmentation

Every channel MUST import `Awaitable` from `@julr/utils/types` and include module augmentation at the bottom of `channel.ts`:

```typescript
declare module '@facteurjs/core/types' {
  interface Notification {
    asXxxMessage(): Awaitable<XxxMessage>
  }
}
```

Use PascalCase for the method name: `as{ChannelName}Message()`

## Testing Pattern

See `references/testing-patterns.md` for test file generation guidelines.

Tests should be created in `packages/core/tests/{channel-name}.spec.ts`.

## Existing Channel References

Use these existing channels as reference implementations:
- **FCM** (`packages/core/src/channels/fcm/`): Independent channel with batch support
- **Expo** (`packages/core/src/channels/expo/`): Independent channel with batch support
- **Twilio** (`packages/core/src/channels/twilio/`): Independent channel without batch
- **Slack** (`packages/core/src/channels/slack/`): Webhook-based channel
- **Discord** (`packages/core/src/channels/discord/`): Webhook-based channel

## Checklist Before Completing

- [ ] All 4 files created in `packages/core/src/channels/{channel-name}/`
- [ ] Factory function named `{channelName}Channel` (lowercase)
- [ ] Class named `{ChannelName}Channel` (PascalCase)
- [ ] `name` property set to `'{channelName}'` with `as const`
- [ ] `[kTargetSymbol]` property typed correctly
- [ ] Module augmentation with `as{ChannelName}Message()` method
- [ ] All private members use `#` prefix
- [ ] Method order: properties, constructor, private methods, public methods
- [ ] Imports use `.js` extension
- [ ] JSDoc comments are concise without @param/@returns
- [ ] Tests created in `packages/core/tests/`
