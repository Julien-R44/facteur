import type { Transmit } from '@boringnode/transmit'

export interface TransmitTargets {
  channel: string
}

export interface TransmitConfig {
  transmit: Transmit<any>
}
