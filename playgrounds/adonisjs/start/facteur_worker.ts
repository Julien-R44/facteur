/**
 * Initialize the Facteur worker context.
 * This must be loaded before the queue worker starts processing jobs.
 */
import { initFacteurWorker } from '@facteurjs/adapter-boring-queue'
import facteur from '../facteur/service.js'

await initFacteurWorker({
  facteur,

  // Optional hooks
  beforeSend: async (payload) => {
    console.log(`[Facteur] Processing: ${payload.notificationIdentifier} via ${payload.channelName}`)
    return true
  },

  afterSend: async (payload) => {
    console.log(`[Facteur] Sent: ${payload.notificationIdentifier} via ${payload.channelName}`)
  },

  onError: async (payload, error) => {
    console.error(`[Facteur] Failed: ${payload.notificationIdentifier}`, error.message)
  },
})

console.log('[Facteur] Worker context initialized')
