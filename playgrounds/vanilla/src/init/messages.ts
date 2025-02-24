import { facteur } from './facteur.js'
import type { User } from './facteur.js'
import { testMessage } from '../../../packages/slack/src/index.js'
import { DiscordMessage } from '../../../packages/discord/src/index.js'
import { DatabaseMessage } from '../../../packages/database/src/message.js'

export interface BackupStartedMessageParams {
  backupName: string
  destination: string
}

export const backupStartedMessage = facteur.createMessage<User, BackupStartedMessageParams>({
  name: 'backupStarted',

  via(notifiable) {
    return ['discord']
  },

  toDatabase: ({ params }) => {
    return DatabaseMessage.create()
      .setType('backup-started')
      .setContent(`Backup started: ${params.backupName} to ${params.destination}`)
  },

  toDiscord: ({ notifiable, params }) => {
    const body =
      `Backup started: ${params.backupName} to ${params.destination}.\n` +
      `@${notifiable.discordUsername}`

    return DiscordMessage.create().setBotUsername('Backup manager').setBody(body)
  },

  toSlack: ({ params }) => {
    // return testMessage({
    //   menuOptions: [{ name: 'foo', id: 'bla' }],
    //   selected: { name: 'foo', id: 'bla' },
    // })
  },
})
