import { test } from '@japa/runner'

import { createFacteurClient } from '../src/client.ts'

for (const method of ['markAs', 'markAsRead', 'markAsSeen'] as const) {
  test.group(`NotificationsApi | ${method}`, () => {
    for (const tenantId of ['tenant-a', undefined]) {
      test(`sends the correct scope ${tenantId === undefined ? 'without' : 'with'} a tenant`, async ({
        assert,
      }) => {
        const requests: Request[] = []
        const client = createFacteurClient({
          apiUrl: 'https://facteur.example/',
          notifiableId: 'user-1',
          fetch: async (request) => {
            requests.push((request as Request).clone())
            return new Response(null, { status: 204 })
          },
        })
        const options = {
          notificationId: 'notification-42',
          ...(tenantId === undefined ? {} : { tenantId }),
        }

        if (method === 'markAs') await client.notifications.markAs({ ...options, status: 'seen' })
        else await client.notifications[method](options)

        assert.lengthOf(requests, 1)
        assert.equal(requests[0].method, 'POST')
        assert.equal(
          requests[0].url,
          'https://facteur.example/notifications/notifiable/user-1/mark-as',
        )
        assert.deepEqual(await requests[0].json(), {
          ...options,
          status: method === 'markAsRead' ? 'read' : 'seen',
        })
      })
    }
  })
}
