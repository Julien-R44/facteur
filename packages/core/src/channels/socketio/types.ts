import type { Server as SocketIOServer } from 'socket.io'

export interface SocketIOTargets {
  /**
   * Namespace to emit the event to
   */
  namespace?: string

  /**
   * Event to emit
   */
  event: string
}

export interface SocketIOConfig {
  /**
   * Socket.IO server instance. Can be a function that will be resolved when needed
   */
  server: SocketIOServer | (() => SocketIOServer)
}
