import Twilio from 'twilio'

import type { TwilioConfig, TwilioTargets } from './types.js'
import type { TwilioMessage } from './message.js'

import { kTargetSymbol, type Channel, type ChannelSendParams } from '../../types/index.js'
import { errors } from '../../errors/index.js'

export function twilioChannel(config: TwilioConfig) {
  return new TwilioChannel(config)
}

export class TwilioChannel implements Channel<TwilioConfig, TwilioMessage, any, TwilioTargets> {
  name = 'twilio' as const;
  [kTargetSymbol] = null as any as TwilioTargets
  #client: Twilio.Twilio

  constructor(private config: TwilioConfig) {
    this.#client = new (Twilio as any)(config.accountSid, config.authToken)
  }

  async send(options: ChannelSendParams<TwilioMessage, TwilioTargets>) {
    const message = options.message
    const targets = this.#resolveTargets(options)

    const messageData = message.serialize()

    const from = this.#resolveFrom(message, targets)
    if (from) messageData.from = from

    // Set messaging service SID if configured and not already set
    if (this.config.messagingServiceSid && !message.getMessagingServiceSid()) {
      messageData.messagingServiceSid = this.config.messagingServiceSid
    }

    if (this.config.maxPrice !== undefined && message.getMaxPrice() === undefined) {
      messageData.maxPrice = this.config.maxPrice
    }

    if (this.config.shortenUrls) messageData.shortenUrls = true

    const to = this.config.debugTo || targets.to

    try {
      await this.#client.messages.create({ ...messageData, to })
    } catch (error: any) {
      if (this.config.ignoredErrorCodes && error.code) {
        const isIgnored =
          this.config.ignoredErrorCodes.includes(error.code) ||
          this.config.ignoredErrorCodes.includes('*')

        if (isIgnored) return
      }

      throw error
    }
  }

  #resolveTargets(options: ChannelSendParams<TwilioMessage, TwilioTargets>): TwilioTargets {
    if (options.targets) return options.targets

    throw new errors.E_UNAVAILABLE_TARGETS(['Twilio'])
  }

  #resolveFrom(message: TwilioMessage, targets: TwilioTargets): string | undefined {
    // Priority order: message from > targets from > config from > config alphanumeric sender
    if (message.getFrom()) {
      return message.getFrom()
    }

    if (targets.from) {
      return targets.from
    }

    if (this.config.from) {
      return this.config.from
    }

    if (message.getAlphanumericSender()) {
      return message.getAlphanumericSender()
    }

    if (this.config.alphanumericSender) {
      return this.config.alphanumericSender
    }

    return undefined
  }
}

declare module '@facteurjs/core/types' {
  interface Notification {
    asTwilioMessage(): TwilioMessage
  }
}
