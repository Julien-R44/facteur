import { WebhookMessage } from '../webhook/message.js'
import type {
  DiscordEmbedAuthor,
  DiscordEmbedField,
  DiscordEmbedFooter,
  HexadecimalColor,
} from './types.js'

export class DiscordMessage extends WebhookMessage {
  #body = ''
  #username = ''
  #avatarUrl = ''
  #tts = false
  #embeds: DiscordEmbed[] = []

  /**
   * Creates a new instance of DiscordMessage.
   */
  static override create() {
    return new DiscordMessage().setQueryParameters({ wait: 'true' })
  }

  /**
   * Sets the content of the message.
   */
  override setBody(body: string) {
    this.#body = body
    return this
  }

  /**
   * Sets the username of the bot that will send the message.
   */
  setBotUsername(username: string) {
    this.#username = username
    return this
  }

  /**
   * Sets the avatar URL for the bot that will send the message.
   */
  setBotAvatar(avatarUrl: string) {
    this.#avatarUrl = avatarUrl
    return this
  }

  /**
   * Adds an embed to the message using a callback function to configure it.
   */
  addEmbed(callback: (embed: DiscordEmbed) => void) {
    const embed = new DiscordEmbed()
    callback(embed)
    this.#embeds.push(embed)
    return this
  }

  /**
   * Whether or not this notification should be read as text to speech.
   */
  setTTS(flag: boolean) {
    this.#tts = flag
    return this
  }

  override serialize() {
    return {
      ...super.serialize(),
      body: {
        tts: this.#tts,
        content: this.#body,
        ...(this.#username ? { username: this.#username } : {}),
        ...(this.#avatarUrl ? { avatar_url: this.#avatarUrl } : {}),
        embeds: this.#embeds.map((embed) => embed.serialize()),
      },
    }
  }
}

export class DiscordEmbed {
  #title?: string
  #description?: string
  #url?: string
  #color?: number
  #fields?: DiscordEmbedField[]
  #author?: DiscordEmbedAuthor
  #footer?: DiscordEmbedFooter
  #image?: string
  #timestamp?: Date
  #thumbnail?: string

  /**
   * Sets the author information for the embed.
   */
  setAuthor(options: { name?: string; url?: string; iconUrl?: string }) {
    this.#author = options
    return this
  }

  /**
   * Sets the title of the embed.
   */
  setTitle(title: string) {
    this.#title = title
    return this
  }

  /**
   * Sets the description text for the embed.
   */
  setDescription(description: string) {
    this.#description = description
    return this
  }

  /**
   * Sets the URL for the embed title to link to.
   */
  setUrl(url: string) {
    this.#url = url
    return this
  }

  /**
   * Sets the color of the embed's left border. Accepts a hexadecimal color code.
   */
  setColor(color: HexadecimalColor) {
    this.#color = Number.parseInt(color.slice(1), 16)
    return this
  }

  /**
   * Adds a field to the embed with a name and value.
   *
   * Inline fields will be displayed next to each other, rather than each on their own line.
   */
  addField(options: { name: string; value: string; inline?: boolean }) {
    this.#fields = this.#fields || []
    this.#fields.push(options)
    return this
  }

  /**
   * Sets the footer information for the embed, including optional timestamp.
   */
  setFooter(options: { text: string; iconUrl?: string }) {
    this.#footer = options
    return this
  }

  /**
   * Set a date that will be displayed in the footer.
   */
  setTimestamp(timestamp: Date) {
    this.#timestamp = timestamp
    return this
  }

  /**
   * Adds an image to the embed.
   * You can add up to 4 images when you have an URL in the Embed body. ( `embed.setUrl()` )
   * Otherwise, only one image will be displayed.
   */
  setImage(image: string) {
    this.#image = image
    return this
  }

  /**
   * Sets the thumbnail image for the embed.
   */
  setThumbnail(url: string) {
    this.#thumbnail = url
    return this
  }

  serialize() {
    return {
      title: this.#title,
      description: this.#description,
      url: this.#url,
      color: this.#color,
      fields: this.#fields,
      image: this.#image ? { url: this.#image } : undefined,
      thumbnail: this.#thumbnail ? { url: this.#thumbnail } : undefined,
      author: this.#author
        ? { name: this.#author.name, url: this.#author.url, icon_url: this.#author.iconUrl }
        : undefined,
      footer: this.#footer
        ? { text: this.#footer.text, icon_url: this.#footer.iconUrl }
        : undefined,
      timestamp: this.#timestamp?.toISOString(),
    }
  }
}
