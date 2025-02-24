import type { Agent } from 'node:http'
import type { Block, KnownBlock, MessageAttachment } from '@slack/types'

export interface SlackOptions {
  webhookUrl: string
}

export interface SlackWebhookPayload {
  username?: string
  icon_emoji?: string
  icon_url?: string
  channel?: string
  text?: string
  link_names?: boolean
  agent?: Agent
  timeout?: number
  attachments?: MessageAttachment[]
  blocks?: (KnownBlock | Block)[]
  unfurl_links?: boolean
  unfurl_media?: boolean
  metadata?: {
    event_type: string
    event_payload: Record<string, any>
  }
}
