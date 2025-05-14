import type { IncomingWebhookSendArguments } from '@slack/webhook'

import { WebhookMessage } from '../../webhook/src/message.js'

export class SlackMessage extends WebhookMessage {
  #template: IncomingWebhookSendArguments = {}

  static override create() {
    return new SlackMessage()
  }

  useBlockKitTemplate(template: IncomingWebhookSendArguments) {
    this.#template = template
    return this
  }

  text(text: string) {
    this.#template.blocks = this.#template.blocks || []
    this.#template.blocks?.push({
      type: 'section',
      text: { type: 'mrkdwn', text },
    })

    return this
  }

  headerBlock(text: string) {
    return this
  }

  contextBlock(text: string) {
    this.#template.blocks = this.#template.blocks || []
    this.#template.blocks?.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text }],
    })

    return this
  }

  dividerBlock() {
    this.#template.blocks = this.#template.blocks || []
    this.#template.blocks?.push({ type: 'divider' })

    return this
  }
}
