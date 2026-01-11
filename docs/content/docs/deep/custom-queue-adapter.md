# Custom Queue Adapters

Facteur's queueing system is adapter-based, allowing you to integrate with any job queue library. This guide shows how to create your own queue adapter.

## Architecture

A queue adapter has two main responsibilities:

1. **Dispatching jobs** - When `facteur.notification().queue()` is called, the adapter receives payloads and pushes them to your queue
2. **Processing jobs** - A worker reads jobs from the queue and sends the actual notifications

```
┌─────────────┐     ┌───────────────┐     ┌─────────────┐     ┌─────────────┐
│   Facteur   │────▶│ QueueAdapter  │────▶│   Queue     │────▶│   Worker    │
│   .queue()  │     │ .queue()      │     │ (Redis/DB)  │     │ process job │
└─────────────┘     └───────────────┘     └─────────────┘     └─────────────┘
                                                                     │
                                                                     ▼
                                                              ┌─────────────┐
                                                              │   Facteur   │
                                                              │ .sendVia    │
                                                              │  Channel()  │
                                                              └─────────────┘
```

## The QueueAdapter interface

Your adapter must implement the `QueueAdapter` interface from `@facteurjs/core/types`:

```ts
import type { QueueAdapter, NotificationJobPayload, QueueItemOptions } from '@facteurjs/core/types'

export interface QueueAdapter {
  /** Queue a notification job for later processing */
  queue(payload: NotificationJobPayload, options?: QueueItemOptions): Promise<void>
}
```

The interface is intentionally minimal - just one method to queue jobs. The worker that processes jobs is handled separately.

## Understanding the payload

When Facteur queues a notification, it creates a `NotificationJobPayload` for each recipient × channel combination:

```ts
interface NotificationJobPayload {
  /** Notification class identifier (class name or options.identifier) */
  notificationIdentifier: string

  /** Serialized notification params */
  params: Record<string, any>

  /** Serialized recipient data for reconstruction in the worker */
  recipientData: Record<string, any>

  /** Channel to send through */
  channelName: string

  /** Pre-resolved target for the channel (email address, device token, etc.) */
  target: unknown

  /** Tenant ID if multi-tenant */
  tenantId?: string | number
}
```

## Queue options

The `queue()` method receives optional `QueueItemOptions`:

```ts
interface QueueItemOptions {
  /** Delay before processing (milliseconds or duration string like '5m') */
  delay?: number | string

  /** Queue name to use */
  queue?: string
}
```

## Creating the adapter

Here's an example adapter for a fictional queue library called "SimpleQueue":

```ts
// adapter.ts
import type { QueueAdapter, NotificationJobPayload, QueueItemOptions } from '@facteurjs/core/types'
import { SimpleQueue } from 'simple-queue'

export interface SimpleQueueAdapterConfig {
  connection: { host: string; port: number }
  defaultQueue?: string
}

export class SimpleQueueAdapter implements QueueAdapter {
  #queue: SimpleQueue
  #defaultQueue: string

  constructor(config: SimpleQueueAdapterConfig) {
    this.#queue = new SimpleQueue(config.connection)
    this.#defaultQueue = config.defaultQueue ?? 'notifications'
  }

  async queue(payload: NotificationJobPayload, options?: QueueItemOptions): Promise<void> {
    const queueName = options?.queue ?? this.#defaultQueue

    let job = this.#queue.createJob('send-notification', payload)

    // Handle delay option
    if (options?.delay) {
      const delayMs = this.#parseDelay(options.delay)
      job = job.delay(delayMs)
    }

    await job.dispatch(queueName)
  }

  #parseDelay(delay: string | number): number {
    if (typeof delay === 'number') return delay

    // Parse duration strings like '5m', '1h', '30s'
    const match = delay.match(/^(\d+)(ms|s|m|h|d)$/)
    if (!match) throw new Error(`Invalid delay format: ${delay}`)

    const value = Number.parseInt(match[1], 10)
    const unit = match[2]

    const multipliers: Record<string, number> = {
      ms: 1,
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    }

    return value * multipliers[unit]
  }
}
```

## Creating the worker

The worker is responsible for processing jobs and sending notifications. It needs access to your Facteur instance to:

1. Discover notification classes
2. Send messages via channels

Here's how to create a worker context:

```ts
// context.ts
import type { Facteur } from '@facteurjs/core'
import type { Notification, NotificationJobPayload } from '@facteurjs/core/types'

type NotificationConstructor = new (...args: any[]) => Notification<any, any>

export interface WorkerConfig {
  facteur: Facteur<any, any>
}

class QueueContext {
  #facteur: Facteur<any, any> | null = null
  #notificationMap: Map<string, NotificationConstructor> = new Map()

  async init(config: WorkerConfig): Promise<void> {
    this.#facteur = config.facteur

    // Discover all notification classes
    const notifications = await config.facteur.discoverer.discoverNotifications()

    for (const NotifClass of notifications) {
      const options = (NotifClass as any).options || {}
      const identifier = options.identifier || NotifClass.name
      this.#notificationMap.set(identifier, NotifClass as NotificationConstructor)
    }
  }

  async processJob(payload: NotificationJobPayload): Promise<void> {
    if (!this.#facteur) throw new Error('Context not initialized')

    // 1. Find the notification class
    const NotifClass = this.#notificationMap.get(payload.notificationIdentifier)
    if (!NotifClass) throw new Error(`Unknown notification: ${payload.notificationIdentifier}`)

    // 2. Reconstruct the recipient
    const recipient = {
      ...payload.recipientData,
      notificationTargets: () => ({ [payload.channelName]: payload.target }),
    }

    // 3. Create the notification instance
    const notification = new NotifClass({
      to: recipient,
      params: payload.params,
      tenantId: payload.tenantId,
    })

    // 4. Build the message for this channel
    const message = this.#buildMessage(notification, payload.channelName)

    // 5. Send via the channel
    await this.#facteur.sendViaChannel({
      channelName: payload.channelName,
      message,
      target: payload.target,
      recipient,
      tenantId: payload.tenantId,
    })
  }

  #buildMessage(notification: Notification<any, any>, channelName: string): unknown {
    const methodName = `as${channelName.charAt(0).toUpperCase() + channelName.slice(1)}Message`
    const builder = (notification as any)[methodName]

    if (typeof builder !== 'function') {
      throw new Error(`Notification missing ${methodName} method`)
    }

    return builder.call(notification)
  }
}

export const queueContext = new QueueContext()
```

## Creating the job handler

Create a job class or handler that your queue library will execute:

```ts
// job.ts
import { Job } from 'simple-queue'
import type { NotificationJobPayload } from '@facteurjs/core/types'
import { queueContext } from './context.ts'

export class SendNotificationJob extends Job<NotificationJobPayload> {
  static options = {
    queue: 'notifications',
    maxRetries: 3,
  }

  async execute(): Promise<void> {
    await queueContext.processJob(this.payload)
  }
}
```

## Setting up the worker

```ts
// worker.ts
import { Worker } from 'simple-queue'
import { queueContext } from './context.ts'
import { SendNotificationJob } from './job.ts'
import { facteur } from './config/facteur.ts'

export async function startWorker() {
  // Initialize the context with Facteur
  await queueContext.init({ facteur })

  // Start the worker
  const worker = new Worker({
    connection: { host: 'localhost', port: 6379 },
    jobs: {
      'send-notification': SendNotificationJob,
    },
  })

  await worker.start(['notifications'])
}
```

## Usage

Register your adapter with Facteur:

```ts
import { createFacteur } from '@facteurjs/core'
import { SimpleQueueAdapter } from './adapters/simple-queue/adapter.ts'

const facteur = createFacteur({
  // ... other config
  queueAdapter: new SimpleQueueAdapter({
    connection: { host: 'localhost', port: 6379 },
    defaultQueue: 'notifications',
  }),
})
```

Then start your worker in a separate process:

```ts
// Run this in a separate process
import { startWorker } from './worker.ts'
await startWorker()
```

## Key considerations

### Serialization

The payload is serialized to JSON. Make sure:
- Notification params are serializable (no class instances, functions, or circular refs)
- Recipient data is serializable

### Error handling

Your job handler should handle errors appropriately. Most queue libraries support automatic retries with backoff.

### Worker lifecycle

The worker needs access to the same Facteur configuration (channels, etc.) as your main application. Make sure to initialize the context before processing jobs.

### Multiple workers

You can run multiple worker processes for horizontal scaling. Each job is processed by exactly one worker.

## Package structure

A typical queue adapter package might look like:

```
packages/adapter-your-queue/
├── package.json
├── src/
│   ├── index.ts       # Exports
│   ├── adapter.ts     # QueueAdapter implementation
│   ├── job.ts         # Job handler class
│   ├── context.ts     # Worker context
│   ├── worker.ts      # Worker initialization
│   └── types.ts       # TypeScript interfaces
```
