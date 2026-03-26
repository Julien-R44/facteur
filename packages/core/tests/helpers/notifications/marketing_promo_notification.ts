import { Notification } from '../../../src/types/index.ts'

export default class MarketingPromoNotification extends Notification<undefined, any> {
  static override options = {
    name: 'MarketingPromo',
    identifier: 'marketing.promo',
    category: 'marketing',
    tags: ['marketing'],
    deliverBy: { email: true },
  }

  asEmailMessage() {
    return { subject: 'Promo', body: 'Promo' }
  }
}
