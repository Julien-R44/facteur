import { test } from '@japa/runner'

import { FcmMessage } from '../src/channels/fcm/message.ts'
import { FcmChannel } from '../src/channels/fcm/channel.ts'

function createChannel(debugToken?: string) {
  let lastMessage: any = null
  const fakeMessaging = {
    send: async (msg: any) => { lastMessage = msg; return 'msg-id' },
    sendEach: async () => ({ successCount: 0, failureCount: 0, responses: [] }),
  }

  const channel = new FcmChannel(
    debugToken ? { debugToken } : {},
    fakeMessaging as any,
  )

  return { channel, getLastMessage: () => lastMessage }
}

test.group('FCM buildMessage', () => {
  test('uses target token when no debugToken', async ({ assert }) => {
    const { channel, getLastMessage } = createChannel()
    await channel.send({ message: FcmMessage.create().setTitle('Hello'), targets: { token: 'device-token' } })

    const sent = getLastMessage()
    assert.equal(sent.token, 'device-token')
    assert.isUndefined(sent.topic)
    assert.isUndefined(sent.condition)
  })

  test('uses target topic when no debugToken', async ({ assert }) => {
    const { channel, getLastMessage } = createChannel()
    await channel.send({ message: FcmMessage.create().setTitle('Hello'), targets: { topic: 'news' } })

    const sent = getLastMessage()
    assert.equal(sent.topic, 'news')
    assert.isUndefined(sent.token)
    assert.isUndefined(sent.condition)
  })

  test('debugToken overrides target token', async ({ assert }) => {
    const { channel, getLastMessage } = createChannel('debug-token')
    await channel.send({ message: FcmMessage.create().setTitle('Hello'), targets: { token: 'device-token' } })

    const sent = getLastMessage()
    assert.equal(sent.token, 'debug-token')
    assert.isUndefined(sent.topic)
    assert.isUndefined(sent.condition)
  })

  test('debugToken overrides topic target', async ({ assert }) => {
    const { channel, getLastMessage } = createChannel('debug-token')
    await channel.send({ message: FcmMessage.create().setTitle('Hello'), targets: { topic: 'news' } })

    const sent = getLastMessage()
    assert.equal(sent.token, 'debug-token')
    assert.isUndefined(sent.topic)
    assert.isUndefined(sent.condition)
  })

  test('debugToken overrides condition target', async ({ assert }) => {
    const { channel, getLastMessage } = createChannel('debug-token')
    await channel.send({ message: FcmMessage.create().setTitle('Hello'), targets: { condition: "'news' in topics" } })

    const sent = getLastMessage()
    assert.equal(sent.token, 'debug-token')
    assert.isUndefined(sent.topic)
    assert.isUndefined(sent.condition)
  })
})
