import type { Awaitable } from '@julr/utils/types'

import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'

import type { AwsSnsConfig, AwsSnsTargets } from './types.ts'
import type { AwsSnsMessage } from './message.ts'

import { kTargetSymbol, type Channel, type ChannelSendParams } from '../../types/index.ts'
import { errors } from '../../errors/index.ts'

export function awsSnsChannel(config: AwsSnsConfig) {
  return new AwsSnsChannel(config)
}

export class AwsSnsChannel implements Channel<AwsSnsConfig, AwsSnsMessage, any, AwsSnsTargets> {
  name = 'awsSns' as const;
  [kTargetSymbol] = null as any as AwsSnsTargets
  #client: SNSClient

  constructor(private config: AwsSnsConfig) {
    this.#client = new SNSClient({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
        ...(this.config.sessionToken && { sessionToken: this.config.sessionToken }),
      },
    })
  }

  #resolveTargets(options: ChannelSendParams<AwsSnsMessage, AwsSnsTargets>): AwsSnsTargets {
    if (options.targets) return options.targets

    throw new errors.E_UNAVAILABLE_TARGETS(['AWS SNS'])
  }

  async send(options: ChannelSendParams<AwsSnsMessage, AwsSnsTargets>) {
    const message = options.message
    const targets = this.#resolveTargets(options)

    const messageData = message.serialize()

    const command = new PublishCommand({
      PhoneNumber: targets.to,
      Message: messageData.Message,
    })

    await this.#client.send(command)
  }
}

declare module '@facteurjs/core/types' {
  interface Notification {
    asAwsSnsMessage(): Awaitable<AwsSnsMessage>
  }
}
