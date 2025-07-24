import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import User from '#models/user'
import InvoicePaidNotification from '../app/notifications/invoice_paid_notification.js'

export default class SendNotification extends BaseCommand {
  static commandName = 'send:notification'
  static description = ''

  static options: CommandOptions = {}

  async run() {
    await User.firstOrFail()

    new InvoicePaidNotification()
  }
}
