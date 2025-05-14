import { DiscordMessage } from '@facteurjs/discord'
import { DatabaseMessage } from '@facteurjs/database'

import { facteur } from '../init/facteur.js'
import type { User } from '../init/facteur.js'

export interface BackupStartedMessageParams {
  backupName: string
  destination: string
}

export const backupStartedMessage = facteur.defineMessage<User, BackupStartedMessageParams>({
  name: 'backupStarted',

  via() {
    return ['discord', 'database']
  },

  toDatabase: ({ params }) => {
    return DatabaseMessage.create()
      .setType('backup-started')
      .setContent(`Backup started: ${params.backupName} to ${params.destination}`)
  },

  toDiscord: ({ params }) => {
    return DiscordMessage.create()
      .setBotUsername('Test')
      .setBotAvatar('https://modii.org/wp-content/uploads/2020/12/random.png')
      .addEmbed((embed) => {
        embed
          .setColor('#ff0000')
          .setAuthor({
            name: 'Backup started',
            iconUrl: 'https://modii.org/wp-content/uploads/2020/12/random.png',
            url: 'https://modii.org',
          })
          .setDescription(`Backup started: ${params.backupName} to ${params.destination}`)
          .setTitle('Backup started')
          .setFooter({
            text: 'Footer text',
            iconUrl: 'https://modii.org/wp-content/uploads/2020/12/random.png',
          })
          .setThumbnail('https://modii.org/wp-content/uploads/2020/12/random.png')
          .setTimestamp(new Date())
          .setUrl('https://modii.org')
          .setImage('https://modii.org/wp-content/uploads/2020/12/random.png')
          .addField({ name: 'Field 2', value: 'Value 2', inline: true })
          .addField({ name: 'Field 3', value: 'Value 3', inline: true })
          .addField({ name: 'Field 1', value: 'Value 1', inline: true })
          .addField({ name: 'Field 1', value: 'Value 1', inline: true })
          .addField({ name: 'Field 2', value: 'Value 2', inline: true })
          .addField({ name: 'Field 3', value: 'Value 3', inline: true })
      })
  },
})
