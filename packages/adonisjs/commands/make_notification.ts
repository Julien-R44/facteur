import type { CommandOptions } from '@adonisjs/core/types/ace'

import StringBuilder from '@poppinss/utils/string_builder'
import string from '@poppinss/utils/string'
import { BaseCommand, args } from '@adonisjs/core/ace'

import { stubsRoot } from '../stubs/index.ts'

export default class MakeNotification extends BaseCommand {
  static override commandName = 'make:notification'
  static override description = 'Make a new notification class'
  static override options: CommandOptions = {
    allowUnknownFlags: true,
  }

  @args.string({ description: 'Name of the notification' })
  declare name: string

  #computeNotificationName() {
    return new StringBuilder(this.name)
      .removeExtension()
      .removeSuffix('notification')
      .pascalCase()
      .suffix(string.pascalCase('notification'))
      .toString()
  }

  override async run(): Promise<void> {
    const codemods = await this.createCodemods()

    await codemods.makeUsingStub(stubsRoot, 'make/notification/main.stub', {
      flags: this.parsed.flags,
      notificationName: this.#computeNotificationName(),
      notificationFileName: new StringBuilder(this.#computeNotificationName())
        .snakeCase()
        .ext('.ts')
        .toString(),
    })
  }
}
