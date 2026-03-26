import { Notification } from '../../../src/types/index.ts'

export default class BillingReportNotification extends Notification<undefined, any> {
  static override options = {
    name: 'BillingReport',
    identifier: 'billing.report',
    category: 'billing',
    tags: ['billing'],
    deliverBy: { email: true, sms: true },
  }

  asEmailMessage() {
    return { subject: 'Billing Report', body: 'Report' }
  }
}
