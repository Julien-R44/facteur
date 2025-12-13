import type ConfigureCommand from '@adonisjs/core/commands/configure'

import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'

import { stubsRoot } from './stubs/index.js'

export async function addSubpathImport(command: ConfigureCommand) {
  try {
    const pkgJson = await readFile(
      join(fileURLToPath(command.app.appRoot), 'package.json'),
      'utf-8',
    )

    const pkg = JSON.parse(pkgJson)
    pkg.imports ??= {}
    pkg.imports['#notifications/*'] = './app/notifications/*.js'

    await writeFile(
      join(fileURLToPath(command.app.appRoot), 'package.json'),
      JSON.stringify(pkg, null, 2) + '\n',
    )
  } catch (error: any) {
    command.logger.error('Failed to add subpath import in your package.json :' + error.message)
    command.logger.error('Please add the following to your package.json:\n')
    command.logger.error(`\n"imports": {\n  "#notifications/*": "./app/notifications/*.js"\n},\n`)
  }
}

export async function configure(command: ConfigureCommand) {
  const codemods = await command.createCodemods()
  await codemods.makeUsingStub(stubsRoot, 'config/notifications.stub', {})

  await codemods.updateRcFile((rcFile) => {
    rcFile.addProvider('@facteurjs/adonisjs/facteur_provider')
  })

  await addSubpathImport(command)

  await codemods.makeUsingStub(stubsRoot, 'migration.stub', {
    entity: command.app.generators.createEntity('notifications'),
    migration: {
      folder: 'database/migrations',
      fileName: `${new Date().getTime()}_create_notifications_table.ts`,
    },
  })

  await codemods.makeUsingStub(stubsRoot, 'migrations/preferences.stub', {
    entity: command.app.generators.createEntity('notifications_preferences'),
    migration: {
      folder: 'database/migrations',
      fileName: `${new Date().getTime()}_create_notifications_preferences_table.ts`,
    },
  })
}
