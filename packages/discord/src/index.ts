import { defineProvider } from '@facteurjs/core'

import type { DiscordOptions, DiscordResponse } from './types.js'

export const discordProvider = defineProvider<DiscordOptions, DiscordMessage, DiscordResponse>(
  'discord' as const,
  (options) => {
    const url = new URL(options.webhookUrl)
    url.searchParams.set('wait', 'true')

    return {
      async send({ message }) {
        const result = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.serialize()),
        })

        return result.json() as Promise<DiscordResponse>
      },
    }
  },
)

export class DiscordMessage {
  static create() {
    return new DiscordMessage()
  }

  #body = ''
  #username = ''
  #tts = false

  setBody(body: string) {
    this.#body = body
    return this
  }

  setBotUsername(username: string) {
    this.#username = username
    return this
  }

  /**
   * Whether or not this notification should be read as text to speech.
   */
  setTTS(flag: boolean) {
    this.#tts = flag
    return this
  }

  serialize() {
    return {
      content: this.#body,
      username: this.#username,
      tts: this.#tts,
    }
  }
}
