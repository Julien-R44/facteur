import { rootUser } from '../init/facteur.js'
import { backupStartedMessage } from '../init/messages.js'

/**
 * Send a notification to the user
 */
await rootUser.notify(backupStartedMessage, {
  backupName: 'My backup',
  destination: 'My destination',
})
