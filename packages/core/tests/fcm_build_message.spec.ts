import { getMessaging } from 'firebase-admin/messaging'
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app'
import { test } from '@japa/runner'

import { FcmMessage } from '../src/channels/fcm/message.ts'
import { fcmChannel, FcmChannel } from '../src/channels/fcm/channel.ts'

test('FCM channels coexist with an existing Firebase app without sharing credentials', async ({
  assert,
  cleanup,
}) => {
  const existingApps = new Set(getApps())
  cleanup(async () => {
    await Promise.all(
      getApps()
        .filter((app) => !existingApps.has(app))
        .map(deleteApp),
    )
  })

  const defaultCredential = applicationDefault()
  const defaultApp = initializeApp({ projectId: 'existing-project', credential: defaultCredential })
  const credentialA = { getAccessToken: async () => ({ access_token: 'test-a', expires_in: 3600 }) }
  const credentialB = { getAccessToken: async () => ({ access_token: 'test-b', expires_in: 3600 }) }
  const channelA = fcmChannel({ projectId: 'push-a', credential: credentialA })
  const channelB = fcmChannel({
    projectId: 'push-b',
    credential: credentialB,
    debugToken: 'debug-b',
  })
  const appA = getApps().find((app) => app.options.projectId === 'push-a')!
  const appB = getApps().find((app) => app.options.projectId === 'push-b')!

  assert.strictEqual(defaultApp.options.credential, defaultCredential)
  assert.deepEqual(await appA.options.credential!.getAccessToken(), {
    access_token: 'test-a',
    expires_in: 3600,
  })
  assert.deepEqual(await appB.options.credential!.getAccessToken(), {
    access_token: 'test-b',
    expires_in: 3600,
  })
  assert.notProperty(appB.options, 'debugToken')
  getMessaging(appA).send = async (message) => `push-a:${(message as { token: string }).token}`
  getMessaging(appB).send = async (message) => `push-b:${(message as { token: string }).token}`

  assert.equal(
    await channelA.send({
      message: FcmMessage.create().setTitle('A'),
      targets: { token: 'device-a' },
    }),
    'push-a:device-a',
  )
  assert.equal(
    await channelB.send({
      message: FcmMessage.create().setTitle('B'),
      targets: { token: 'device-b' },
    }),
    'push-b:debug-b',
  )
})

function createChannel(debugToken?: string) {
  let lastMessage: any = null
  const fakeMessaging = {
    send: async (msg: any) => {
      lastMessage = msg
      return 'msg-id'
    },
    sendEach: async () => ({ successCount: 0, failureCount: 0, responses: [] }),
  }

  const channel = new FcmChannel(debugToken ? { debugToken } : {}, fakeMessaging as any)

  return { channel, getLastMessage: () => lastMessage }
}

test.group('FCM buildMessage', () => {
  test('uses target token when no debugToken', async ({ assert }) => {
    const { channel, getLastMessage } = createChannel()
    await channel.send({
      message: FcmMessage.create().setTitle('Hello'),
      targets: { token: 'device-token' },
    })

    const sent = getLastMessage()
    assert.equal(sent.token, 'device-token')
    assert.isUndefined(sent.topic)
    assert.isUndefined(sent.condition)
  })

  test('uses target topic when no debugToken', async ({ assert }) => {
    const { channel, getLastMessage } = createChannel()
    await channel.send({
      message: FcmMessage.create().setTitle('Hello'),
      targets: { topic: 'news' },
    })

    const sent = getLastMessage()
    assert.equal(sent.topic, 'news')
    assert.isUndefined(sent.token)
    assert.isUndefined(sent.condition)
  })

  test('debugToken overrides target token', async ({ assert }) => {
    const { channel, getLastMessage } = createChannel('debug-token')
    await channel.send({
      message: FcmMessage.create().setTitle('Hello'),
      targets: { token: 'device-token' },
    })

    const sent = getLastMessage()
    assert.equal(sent.token, 'debug-token')
    assert.isUndefined(sent.topic)
    assert.isUndefined(sent.condition)
  })

  test('debugToken overrides topic target', async ({ assert }) => {
    const { channel, getLastMessage } = createChannel('debug-token')
    await channel.send({
      message: FcmMessage.create().setTitle('Hello'),
      targets: { topic: 'news' },
    })

    const sent = getLastMessage()
    assert.equal(sent.token, 'debug-token')
    assert.isUndefined(sent.topic)
    assert.isUndefined(sent.condition)
  })

  test('debugToken overrides condition target', async ({ assert }) => {
    const { channel, getLastMessage } = createChannel('debug-token')
    await channel.send({
      message: FcmMessage.create().setTitle('Hello'),
      targets: { condition: "'news' in topics" },
    })

    const sent = getLastMessage()
    assert.equal(sent.token, 'debug-token')
    assert.isUndefined(sent.topic)
    assert.isUndefined(sent.condition)
  })
})
