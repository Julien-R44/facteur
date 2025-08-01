import type { ExpoClientOptions } from 'expo-server-sdk'

export interface ExpoConfig extends Partial<ExpoClientOptions> {}

export interface ExpoTargets {
  expoToken: string
}
