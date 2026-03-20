import type { MailService } from '@adonisjs/mail/types'

import { errors } from '@facteurjs/core'
import { Message, BaseMail } from '@adonisjs/mail'

import { kTargetSymbol, type Channel, type ChannelSendParams } from '@facteurjs/core/types'

export interface MailConfig {
  mailer: MailService
}

export type PossibleMailMessage = BaseMail | MailMessage

export class MailMessage extends Message {
  static create() {
    return new MailMessage()
  }
}

export function mailChannel(config: MailConfig) {
  return new MailChannel(config)
}

export interface MailTargets {
  email: string
}

export class MailChannel implements Channel<MailConfig, PossibleMailMessage, any, MailTargets> {
  name = 'mail' as const;
  [kTargetSymbol] = null as any as MailTargets

  constructor(private config: MailConfig) {}

  async send(options: ChannelSendParams<PossibleMailMessage, MailTargets>) {
    const targets = options.targets
    if (!targets || !targets.email) {
      throw new errors.E_UNAVAILABLE_TARGETS(['Mail'])
    }

    if (options.message instanceof BaseMail) {
      options.message.message.to(targets.email)
      await this.config.mailer.send(options.message)
    } else {
      options.message.to(targets.email)
      await this.config.mailer.send((message) => {
        Object.assign(message, options.message)
      })
    }
  }
}
