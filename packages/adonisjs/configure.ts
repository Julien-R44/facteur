import type ConfigureCommand from '@adonisjs/core/commands/configure'

import { stubsRoot } from './stubs/index.js'

export async function configure(command: ConfigureCommand) {
  const codemods = await command.createCodemods()
  await codemods.makeUsingStub(stubsRoot, 'config/notifications.stub', {})

  await codemods.updateRcFile((rcFile) => {
    rcFile.addProvider('@facteurjs/adonisjs/facteur_provider')
  })

  // TODO : add subpath import
  await codemods.makeUsingStub(stubsRoot, 'migration.stub', {
    entity: command.app.generators.createEntity('notifications'),
    migration: {
      folder: 'database/migrations',
      fileName: `${new Date().getTime()}_create_notifications_table.ts`,
    },
  })
}
