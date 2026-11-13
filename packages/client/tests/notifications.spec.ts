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

test('preserves legacy Ky hooks, empty responses and readable HTTP error bodies', async ({
  assert,
}) => {
  const requests: Request[] = []
  const client = createFacteurClient({
    apiUrl: 'https://facteur.example/api/v2',
    notifiableId: 'user-1',
    hooks: {
      beforeRequest: [
        (request) => {
          request.headers.set('authorization', 'Bearer test-token')
        },
      ],
    },
    fetch: async (request) => {
      const outgoing = request as Request
      requests.push(outgoing.clone())
      if (outgoing.method === 'GET') {
        return Response.json({ message: 'Unauthorized' }, { status: 401 })
      }
      return new Response(null, { status: 204 })
    },
  })

  await client.notifications.markAllAsRead({ tenantId: 'tenant-b' })
  await client.preferences.update({ preferences: { email: false }, tenantId: 'tenant-b' })

  assert.deepEqual(
    requests.map((request) => request.url),
    [
      'https://facteur.example/api/v2/notifications/notifiable/user-1/mark-all',
      'https://facteur.example/api/v2/notifications/notifiable/user-1/preferences',
    ],
  )
  assert.deepEqual(await requests[0]!.json(), { status: 'read', tenantId: 'tenant-b' })
  assert.deepEqual(await requests[1]!.json(), {
    preferences: { email: false },
    tenantId: 'tenant-b',
  })
  for (const request of requests) {
    assert.equal(request.method, 'POST')
    assert.equal(request.headers.get('authorization'), 'Bearer test-token')
  }

  const error = await client.notifications.list().catch((error) => error)

  assert.instanceOf(error, Error)
  assert.equal(error.response.status, 401)
  assert.deepEqual(await error.response.json(), { message: 'Unauthorized' })
  assert.lengthOf(requests, 3)
  assert.equal(requests[2]!.headers.get('authorization'), 'Bearer test-token')
})
