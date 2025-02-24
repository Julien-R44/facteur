import { facteur, rootUser } from '../init/facteur.js'
import { backupStartedMessage } from '../init/messages.js'

await rootUser.notifyLater(
  backupStartedMessage,
  {
    backupName: 'My backup',
    destination: 'My destination',
  },
  {
    delay: 5000,
  },
)

facteur.disconnect()
