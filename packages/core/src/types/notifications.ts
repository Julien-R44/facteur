import type { ChannelName, NotificationChannels } from './index.js'
import type { ExtractChannelTargets, NotificationOptions } from './options.js'

export abstract class Notification<
  // oxlint-disable-next-line no-unused-vars
  N extends Notifiable = Notifiable,
  // oxlint-disable-next-line no-unused-vars
  Params extends Record<string, any> = any,
> {
  static options: NotificationOptions<any> = {
    name: '',
    tags: [],
    deliverBy: {},
  }
}

export interface ChannelSendResult {
  channel: ChannelName
  status: 'success' | 'failed'
  error?: any
}

export interface NotificationSendResult {
  success: number
  failed: number
  results: ChannelSendResult[]
}

export interface Notifiable {
  notificationTargets?(): NotifiableTargets
}

export type NotifiableTargets = {
  [K in keyof NotificationChannels]?: ExtractChannelTargets<NotificationChannels[K]>
}
