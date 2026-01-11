import { WebhookMessage } from '../webhook/message.ts'

export class SlackMessage extends WebhookMessage {
  #text = ''
  #iconEmoji = ''
  #iconUrl = ''
  #username = ''
  #channel = ''
  #threadTs = ''
  #unfurlLinks = false
  #unfurlMedia = false
  #blocks: SlackBlock[] = []

  /**
   * Creates a new instance of SlackMessage.
   */
  static override create() {
    return new SlackMessage()
  }

  /**
   * Sets the main text content of the message. This will be displayed as fallback text.
   */
  setText(text: string) {
    this.#text = text
    return this
  }

  /**
   * Sets the username for the bot that will send the message.
   */
  setBotUsername(username: string) {
    this.#username = username
    return this
  }

  /**
   * Sets the emoji icon for the bot (e.g., ":ghost:").
   */
  setBotIconEmoji(emoji: string) {
    this.#iconEmoji = emoji
    return this
  }

  /**
   * Sets the avatar URL for the bot.
   */
  setBotIconUrl(url: string) {
    this.#iconUrl = url
    return this
  }

  /**
   * Sets the channel to send the message to.
   */
  setChannel(channel: string) {
    this.#channel = channel
    return this
  }

  /**
   * Sets the thread timestamp to reply to a specific thread.
   */
  setThreadTimestamp(threadTs: string) {
    this.#threadTs = threadTs
    return this
  }

  /**
   * Whether to automatically unfurl links in the message.
   */
  setUnfurlLinks(unfurl: boolean) {
    this.#unfurlLinks = unfurl
    return this
  }

  /**
   * Whether to automatically unfurl media in the message.
   */
  setUnfurlMedia(unfurl: boolean) {
    this.#unfurlMedia = unfurl
    return this
  }

  /**
   * Adds a section block with text content.
   */
  addSectionBlock(callback: (block: SlackSectionBlock) => void) {
    const block = new SlackSectionBlock()
    callback(block)
    this.#blocks.push(block)
    return this
  }

  /**
   * Adds a header block with plain text.
   */
  addHeaderBlock(text: string) {
    this.#blocks.push(new SlackHeaderBlock(text))
    return this
  }

  /**
   * Adds a divider block to separate content.
   */
  addDividerBlock() {
    this.#blocks.push(new SlackDividerBlock())
    return this
  }

  /**
   * Adds a context block with contextual information.
   */
  addContextBlock(callback: (block: SlackContextBlock) => void) {
    const block = new SlackContextBlock()
    callback(block)
    this.#blocks.push(block)
    return this
  }

  /**
   * Adds an image block to display an image.
   */
  addImageBlock(callback: (block: SlackImageBlock) => void) {
    const block = new SlackImageBlock()
    callback(block)
    this.#blocks.push(block)
    return this
  }

  /**
   * Adds an actions block with interactive elements.
   */
  addActionsBlock(callback: (block: SlackActionsBlock) => void) {
    const block = new SlackActionsBlock()
    callback(block)
    this.#blocks.push(block)
    return this
  }

  override serialize() {
    const body: any = {
      text: this.#text,
      username: this.#username,
      icon_emoji: this.#iconEmoji,
      icon_url: this.#iconUrl,
      channel: this.#channel,
      unfurl_links: this.#unfurlLinks,
      unfurl_media: this.#unfurlMedia,
      blocks: this.#blocks.map((block) => block.serialize()),
    }

    if (this.#threadTs) body.thread_ts = this.#threadTs

    return { ...super.serialize(), body }
  }
}

abstract class SlackBlock {
  protected blockId?: string

  setBlockId(blockId: string) {
    this.blockId = blockId
    return this
  }

  abstract serialize(): any
}

export class SlackSectionBlock extends SlackBlock {
  #text?: { type: 'mrkdwn' | 'plain_text'; text: string }
  #fields: { type: 'mrkdwn' | 'plain_text'; text: string }[] = []
  #accessory?: any

  /**
   * Sets the main text for the section using markdown formatting.
   */
  setMarkdownText(text: string) {
    this.#text = { type: 'mrkdwn', text }
    return this
  }

  /**
   * Sets the main text for the section using plain text.
   */
  setPlainText(text: string) {
    this.#text = { type: 'plain_text', text }
    return this
  }

  /**
   * Adds a field to the section using markdown formatting.
   */
  addMarkdownField(text: string) {
    this.#fields.push({ type: 'mrkdwn', text })
    return this
  }

  /**
   * Adds a field to the section using plain text.
   */
  addPlainTextField(text: string) {
    this.#fields.push({ type: 'plain_text', text })
    return this
  }

  /**
   * Adds a button accessory to the section.
   */
  addButtonAccessory(options: {
    text: string
    actionId: string
    value?: string
    style?: 'primary' | 'danger'
  }) {
    this.#accessory = {
      type: 'button',
      text: { type: 'plain_text', text: options.text },
      action_id: options.actionId,
      value: options.value,
      style: options.style,
    }
    return this
  }

  serialize() {
    return {
      type: 'section',
      block_id: this.blockId,
      text: this.#text,
      fields: this.#fields.length > 0 ? this.#fields : undefined,
      accessory: this.#accessory,
    }
  }
}

export class SlackHeaderBlock extends SlackBlock {
  #text: string

  constructor(text: string) {
    super()
    this.#text = text
  }

  serialize() {
    return {
      type: 'header',
      block_id: this.blockId,
      text: { type: 'plain_text', text: this.#text },
    }
  }
}

export class SlackDividerBlock extends SlackBlock {
  serialize() {
    return {
      type: 'divider',
      block_id: this.blockId,
    }
  }
}

export class SlackContextBlock extends SlackBlock {
  #elements: Array<{
    type: 'mrkdwn' | 'plain_text' | 'image'
    text?: string
    image_url?: string
    alt_text?: string
  }> = []

  /**
   * Adds markdown text to the context block.
   */
  addMarkdownText(text: string) {
    this.#elements.push({ type: 'mrkdwn', text })
    return this
  }

  /**
   * Adds plain text to the context block.
   */
  addPlainText(text: string) {
    this.#elements.push({ type: 'plain_text', text })
    return this
  }

  /**
   * Adds an image to the context block.
   */
  addImage(options: { imageUrl: string; altText: string }) {
    this.#elements.push({ type: 'image', image_url: options.imageUrl, alt_text: options.altText })
    return this
  }

  serialize() {
    return {
      type: 'context',
      block_id: this.blockId,
      elements: this.#elements,
    }
  }
}

export class SlackImageBlock extends SlackBlock {
  #imageUrl?: string
  #altText?: string
  #title?: string

  /**
   * Sets the image URL for the block.
   */
  setImageUrl(url: string) {
    this.#imageUrl = url
    return this
  }

  /**
   * Sets the alt text for accessibility.
   */
  setAltText(altText: string) {
    this.#altText = altText
    return this
  }

  /**
   * Sets an optional title for the image.
   */
  setTitle(title: string) {
    this.#title = title
    return this
  }

  serialize() {
    return {
      type: 'image',
      block_id: this.blockId,
      image_url: this.#imageUrl,
      alt_text: this.#altText,
      title: this.#title ? { type: 'plain_text', text: this.#title } : undefined,
    }
  }
}

export class SlackActionsBlock extends SlackBlock {
  #elements: any[] = []

  /**
   * Adds a button to the actions block.
   */
  addButton(options: {
    text: string
    actionId: string
    value?: string
    style?: 'primary' | 'danger'
    url?: string
  }) {
    this.#elements.push({
      type: 'button',
      text: { type: 'plain_text', text: options.text },
      action_id: options.actionId,
      value: options.value,
      style: options.style,
      url: options.url,
    })
    return this
  }

  /**
   * Adds a static select menu to the actions block.
   */
  addStaticSelect(options: {
    placeholder: string
    actionId: string
    options: Array<{ text: string; value: string }>
  }) {
    this.#elements.push({
      type: 'static_select',
      placeholder: { type: 'plain_text', text: options.placeholder },
      action_id: options.actionId,
      options: options.options.map((option) => ({
        text: { type: 'plain_text', text: option.text },
        value: option.value,
      })),
    })
    return this
  }

  /**
   * Adds a date picker to the actions block.
   */
  addDatePicker(options: { placeholder: string; actionId: string; initialDate?: string }) {
    this.#elements.push({
      type: 'datepicker',
      placeholder: { type: 'plain_text', text: options.placeholder },
      action_id: options.actionId,
      initial_date: options.initialDate,
    })
    return this
  }

  serialize() {
    return {
      type: 'actions',
      block_id: this.blockId,
      elements: this.#elements,
    }
  }
}
