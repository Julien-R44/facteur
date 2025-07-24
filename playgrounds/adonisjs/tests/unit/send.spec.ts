import { test } from '@japa/runner'

import facteur from '../../facteur/service.js'
import InvoicePaidNotification from '../../app/notifications/invoice_paid_notification.js'

test.group('Send', () => {
  test('example test', async ({ assert, client }) => {
    const notifications = facteur.fake()

    await client.post('/send').json({ identifier: 'InvoicePaidNotification' })

    notifications.assertSentCount(1)
    notifications.assertSentCount(InvoicePaidNotification, 1)
    const sentNotifications = notifications.sent()

    assert.lengthOf(sentNotifications, 1)

    notifications.assertSent(InvoicePaidNotification, ({ notification, params, notifiable }) => {
      assert.deepEqual(notification instanceof InvoicePaidNotification, true)
      assert.equal(params!.amount, 100)
      assert.equal(notifiable.id, 1)
    })
  })
})
