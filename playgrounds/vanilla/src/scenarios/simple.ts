import { facteur, rootUser } from '../init/facteur.js'
import { backupStartedMessage } from '../init/messages.js'

/**
 * Send a notification to the user
 */
const result = await rootUser.notify(backupStartedMessage, {
  backupName: 'My backup',
  destination: 'My destination',
})

console.log(result)

facteur.compose(backupStartedMessage).via({})
