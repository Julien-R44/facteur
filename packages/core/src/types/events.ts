import type { facteurEvents } from '../events/events.ts'

/**
 * Shape of the emitter accepted by facteur
 * Should be compatible with node's EventEmitter and Emittery
 */
export interface Emitter {
  on: (event: string, callback: (...values: any[]) => void) => void
  once: (event: string, callback: (...values: any[]) => void) => void
  off: (event: string, callback: (...values: any[]) => void) => void
  emit: (event: string, ...values: any[]) => void
}

/**
 * Name/payload of the events emitted by facteur
 */
export type FacteurEvents = {
  'facteur:message:sending': ReturnType<typeof facteurEvents.messageSending>['data']
  'facteur:message:sent': ReturnType<typeof facteurEvents.messageSent>['data']
  'facteur:message:failed': ReturnType<typeof facteurEvents.messageFailed>['data']
  'facteur:notification:sending': ReturnType<typeof facteurEvents.notificationSending>['data']
  'facteur:notification:sent': ReturnType<typeof facteurEvents.notificationSent>['data']
  'facteur:notification:failed': ReturnType<typeof facteurEvents.notificationFailed>['data']
}
