import { Notification } from '../../../src/types/index.ts'

export default class BillingAlertNotification extends Notification<undefined, any> {
  static override options = {
    name: 'BillingAlert',
    identifier: 'billing.alert',
    category: 'billing',
    tags: ['billing'],
    deliverBy: { email: true, sms: true },
  }

  asEmailMessage() {
    return { subject: 'Billing Alert', body: 'Alert' }
  }
}
