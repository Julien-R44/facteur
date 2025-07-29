import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'
import { kTargetSymbol, type Channel, type ChannelSendParams } from '../../types/index.js'

import { errors } from '../../errors/index.js'
import type { AwsSnsMessage } from './message.js'
import type { AwsSnsConfig, AwsSnsTargets } from './types.js'

export function awsSnsChannel(config: AwsSnsConfig) {
  return new AwsSnsChannel(config)
}

export class AwsSnsChannel implements Channel<AwsSnsConfig, AwsSnsMessage, any, AwsSnsTargets> {
  name = 'aws-sns' as const;
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
    const to = targets.to

    const command = new PublishCommand({
      PhoneNumber: to,
      Message: messageData.Message,
    })

    await this.#client.send(command)
  }
}

declare module '@facteurjs/core/types' {
  interface Notification {
    asAwsSnsMessage(): AwsSnsMessage
  }
}
