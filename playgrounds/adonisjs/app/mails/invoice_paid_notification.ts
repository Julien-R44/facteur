import { BaseMail } from '@adonisjs/mail'

export default class InvoicePaidMail extends BaseMail {
  from = 'noreply@example.com'
  subject = 'Invoice Paid'

  prepare() {
    this.message.text('Your invoice has been successfully paid !!!.')
  }
}
