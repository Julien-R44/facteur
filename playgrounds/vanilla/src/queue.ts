import { Queue, Worker } from 'bullmq'
import type { Cluster, ClusterOptions, Redis, RedisOptions } from 'ioredis'

export type ConnectionOptions = RedisOptions | ClusterOptions | Redis | Cluster

export interface BullQueueAdapterOptions {
  connection: ConnectionOptions
}

export function bullQueueAdapter(options: BullQueueAdapterOptions) {
  return new BullQueueAdapter(options)
}

export class BullQueueAdapter {
  #queue: Queue

  constructor(private options: BullQueueAdapterOptions) {
    this.#queue = new Queue('foo', { connection: options.connection })
  }

  async queue(
    message: { notifiable: any; message: any },
    options?: {
      delay?: number
    },
  ) {
    await this.#queue.add(
      'myJobName',
      {
        notifiable: message.notifiable,
        message: message.message,
      },
      {
        delay: options?.delay ?? 0,
        removeOnComplete: true,
      },
    )
  }

  startQueueProcessor() {
    new Worker(
      'foo',
      async (job) => {
        console.log(job.data)
      },
      { connection: this.options.connection },
    )
  }

  disconnect() {
    this.#queue.close()
  }
}
