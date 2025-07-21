import { rootUser } from '../init/facteur.js'
import { backupStartedMessage } from '../init/messages.js'

/**
 * Send a notification to the user
 */
await rootUser.notify({
  message: backupStartedMessage,
  params: { backupName: 'My backup', destination: 'My destination' },
})

// /**
//  * Send a notification to the user
//  */
// await backupStartedMessage.send({
//   notifiable: rootUser,
//   params: { backupName: 'My backup', destination: 'My destination' },
// })

/**
 * Send a notification to anonymous user
 */
await backupStartedMessage.send({
  params: { backupName: 'My backup', destination: 'My destination' },
  via: {
    discord: { marketing: true },
    database: { notifiableId: '1543' },
  },
})
