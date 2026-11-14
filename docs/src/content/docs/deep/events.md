# Events

Facteur emits delivery events through an EventEmitter-compatible object. Pass your own `emitter` in the core configuration to subscribe; otherwise it creates a Node `EventEmitter`. AdonisJS uses the application's emitter automatically.

```ts
import { EventEmitter } from 'node:events'
import type { FacteurEvents } from '@facteurjs/core/types'

const emitter = new EventEmitter()

emitter.on('facteur:message:failed', (event: FacteurEvents['facteur:message:failed']) => {
  console.error(event.channelName, event.error)
})

emitter.on('facteur:notification:sent', (event: FacteurEvents['facteur:notification:sent']) => {
  console.log(event.notification, event.results)
})

// Pass emitter to createFacteur({ channels, discoverer, emitter }).
```

## Event payloads

| Event                          | Payload                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------- |
| `facteur:notification:sending` | `notification`, `resolvedChannels` (channel-to-`{ shouldSend, target }` map) |
| `facteur:notification:sent`    | `notification`, `results` (channel results)                                  |
| `facteur:notification:failed`  | `notification`, `errors` (channel errors)                                    |
| `facteur:message:sending`      | `notification`, `channelName`, `message`                                     |
| `facteur:message:sent`         | `notification`, `channelName`, `message`                                     |
| `facteur:message:failed`       | `notification`, `channelName`, `message`, `error`                            |

`message` is the message builder returned by `as*Message()`, not the serialized provider payload. Events do not contain the provider's response.

In normal mode, notification-level events surround the channel sends. `notification:sent` means there are no failed channel results, including when all channels were skipped. A partial failure emits `notification:failed`, even if another channel succeeded. Both result events fire before `afterSend()` and before any aggregate failure is thrown.

Retries produce one message-level sending event before the attempts and one final sent/failed event after attempts finish, not one event per attempt. Driver batching emits message-level events but no notification-level events. Fakes do not emit delivery events.

Do not use listeners to veto a send; use `shouldSend()` or `deliverBy.if` instead. Listener execution is governed by your emitter and is not a durable background job. See [Creating Notifications](../notifications.md) and [Bulk Sending](../bulk-sending.md) for lifecycle differences.
