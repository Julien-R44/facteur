import { mock } from 'node:test'
import { Expo, type ExpoPushTicket } from 'expo-server-sdk'
import { test } from '@japa/runner'

import { ExpoMessage } from '../src/channels/expo/message.ts'
import { expoChannel, ExpoChannel } from '../src/channels/expo/channel.ts'

const accessToken = 'test-expo-access-secret-not-a-push-token'

test.group('Expo channel | access token', (group) => {
  group.each.teardown(() => mock.restoreAll())

  test('passes an opaque credential to the SDK without using it as a destination', async ({
    assert,
  }) => {
    const send = mock.method(
      Expo.prototype,
      'sendPushNotificationsAsync',
      async (): Promise<ExpoPushTicket[]> => [{ status: 'ok', id: 'ticket-id' }],
    )
    assert.isFalse(Expo.isExpoPushToken(accessToken))

    const channel = expoChannel({ accessToken })
    const message = ExpoMessage.create().setTitle('Hello')
    const result = await channel.send({
      message,
      targets: { expoToken: 'ExpoPushToken[first-device]' },
    })

    assert.deepEqual(result, { id: 'ticket-id', status: 'ok' })
    assert.propertyVal(send.mock.calls[0]!.this, 'accessToken', accessToken)
    assert.deepEqual(send.mock.calls[0]!.arguments, [
      [{ to: 'ExpoPushToken[first-device]', title: 'Hello' }],
    ])

    await channel.sendBatch([{ message, targets: { expoToken: 'ExpoPushToken[second-device]' } }])

    assert.equal(send.mock.callCount(), 2)
    assert.propertyVal(send.mock.calls[1]!.this, 'accessToken', accessToken)
    assert.deepEqual(send.mock.calls[1]!.arguments, [
      [{ to: 'ExpoPushToken[second-device]', title: 'Hello' }],
    ])
  })

  test('keeps the access token optional', async ({ assert }) => {
    const send = mock.method(
      Expo.prototype,
      'sendPushNotificationsAsync',
      async (): Promise<ExpoPushTicket[]> => [{ status: 'ok', id: 'ticket-id' }],
    )

    for (const channel of [expoChannel(), new ExpoChannel({})]) {
      const result = await channel.send({
        message: ExpoMessage.create().setBody('Hello'),
        targets: { expoToken: 'ExpoPushToken[device]' },
      })
      assert.deepEqual(result, { id: 'ticket-id', status: 'ok' })
    }

    assert.equal(send.mock.callCount(), 2)
    for (const call of send.mock.calls) {
      assert.propertyVal(call.this, 'accessToken', undefined)
    }
  })

  test('does not expose the credential when targets are missing', async ({ assert }) => {
    const send = mock.method(Expo.prototype, 'sendPushNotificationsAsync', async () => [])
    const channel = new ExpoChannel({ accessToken })

    await assert.rejects(
      () =>
        channel.send({ message: ExpoMessage.create() }).catch((error: Error) => {
          assert.notInclude(error.stack ?? error.message, accessToken)
          throw error
        }),
      /^Not able to determine targets for channel "Expo"\./,
    )
    assert.equal(send.mock.callCount(), 0)
  })

  test('does not add the credential to authentication failure errors', async ({ assert }) => {
    mock.method(
      Expo.prototype,
      'sendPushNotificationsAsync',
      async (): Promise<ExpoPushTicket[]> => [
        {
          status: 'error',
          message: 'Invalid credentials',
          details: { error: 'InvalidCredentials' },
        },
      ],
    )
    const channel = new ExpoChannel({ accessToken })

    await assert.rejects(
      () =>
        channel
          .send({
            message: ExpoMessage.create(),
            targets: { expoToken: 'ExpoPushToken[device]' },
          })
          .catch((error: Error) => {
            assert.equal(error.message, 'Expo push notification failed: Invalid credentials')
            assert.notInclude(error.stack ?? error.message, accessToken)
            throw error
          }),
      /^Expo push notification failed: Invalid credentials$/,
    )
  })
})
