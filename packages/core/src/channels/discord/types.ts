import type { WebhookOptions, WebhookTargets } from '../webhook/types.ts'

export type DiscordOptions<WebhooksNames extends string> = WebhookOptions<WebhooksNames>
export type DiscordTargets<Options extends DiscordOptions<any>> = WebhookTargets<Options>

export type HexadecimalColor = `#${string}`

export interface DiscordResponse {
  type: number
  content: string
  mentions: string[]
  mention_roles: string[]
  attachments: string[]
  embeds: string[]
  timestamp: string
  edited_timestamp: string | null
  flags: number
  components: string[]
  id: string
  channel_id: string
  author: {
    id: string
    username: string
    avatar: string | null
    discriminator: string
    public_flags: number
    flags: number
    bot: boolean
    global_name: string | null
    clan: string | null
    primary_guild: string | null
  }
  pinned: boolean
  mention_everyone: boolean
  tts: boolean
  webhook_id: string
}

export interface DiscordEmbedField {
  name: string
  value: string
  inline?: boolean
}

export interface DiscordEmbedAuthor {
  name?: string
  url?: string
  iconUrl?: string
}

export interface DiscordEmbedFooter {
  text: string
  iconUrl?: string
}
