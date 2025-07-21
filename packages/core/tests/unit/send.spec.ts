import { test } from '@japa/runner'

import { Facteur } from '../../src/facteur.js'
import type { Notifiable, Message, ChannelName } from '../../src/types.js'

// Mock channel for testing
const mockChannel = {
  send: async ({ message, targets, notifiable }: any) => {
    return { message, targets, notifiable }
  },
}

// Mock notifiable
class TestUser implements Notifiable {
  constructor(
    public email: string,
    public discordWebhook?: string,
  ) {}

  notificationTargets() {
    return {
      mail: { destination: this.email },
      ...(this.discordWebhook ? { discord: { webHookUrl: this.discordWebhook } } : {}),
    }
  }
}

// Mock message
class TestMessage implements Message<TestUser, { subject: string }> {
  via({ notifiable }: { notifiable: TestUser }): ChannelName[] {
    const channels: ChannelName[] = ['mail' as ChannelName]
    if (notifiable.discordWebhook) {
      channels.push('discord' as ChannelName)
    }
    return channels
  }

  toMail({ notifiable, params }: { notifiable: TestUser; params?: { subject: string } }) {
    return {
      to: notifiable.email,
      subject: params?.subject || 'Test',
      body: 'Test message',
    }
  }

  toDiscord({ notifiable, params }: { notifiable: TestUser; params?: { subject: string } }) {
    return {
      content: `${params?.subject || 'Test'}: Test message for ${notifiable.email}`,
    }
  }
}

test.group('Facteur send method', () => {
  test('should send to channels suggested by message via method', async ({ assert }) => {
    const facteur = new Facteur({
      channels: {
        mail: mockChannel,
        discord: mockChannel,
      },
    })

    const user = new TestUser('test@example.com', 'https://discord.webhook')
    const message = new TestMessage()

    // Mock the channel send method to capture calls
    const sendCalls: any[] = []
    const mockSend = async (options: any) => {
      sendCalls.push(options)
      return options
    }

    facteur['_options'].channels.mail.send = mockSend
    facteur['_options'].channels.discord.send = mockSend

    await facteur.send({
      message,
      notifiable: user,
      params: { subject: 'Hello' },
    })

    // Should send to both mail and discord (as suggested by via method)
    assert.lengthOf(sendCalls, 2)

    // Check mail call
    const mailCall = sendCalls.find((call) => call.targets.destination)
    assert.exists(mailCall)
    assert.equal(mailCall.targets.destination, 'test@example.com')
    assert.equal(mailCall.message.subject, 'Hello')

    // Check discord call
    const discordCall = sendCalls.find((call) => call.targets.webHookUrl)
    assert.exists(discordCall)
    assert.equal(discordCall.targets.webHookUrl, 'https://discord.webhook')
    assert.include(discordCall.message.content, 'Hello')
  })

  test('should respect send-time channel configuration', async ({ assert }) => {
    const facteur = new Facteur({
      channels: {
        mail: mockChannel,
        discord: mockChannel,
      },
    })

    const user = new TestUser('test@example.com', 'https://discord.webhook')
    const message = new TestMessage()

    const sendCalls: any[] = []
    const mockSend = async (options: any) => {
      sendCalls.push(options)
      return options
    }

    facteur['_options'].channels.mail.send = mockSend
    facteur['_options'].channels.discord.send = mockSend

    await facteur.send({
      message,
      notifiable: user,
      params: { subject: 'Hello' },
      via: {
        discord: false, // Disable discord
        mail: true, // Keep mail enabled
      },
    })

    // Should only send to mail (discord disabled by channels config)
    assert.lengthOf(sendCalls, 1)
    assert.equal(sendCalls[0].targets.destination, 'test@example.com')
  })

  test('should use custom targets from send-time configuration', async ({ assert }) => {
    const facteur = new Facteur({
      channels: {
        mail: mockChannel,
        discord: mockChannel,
      },
    })

    const user = new TestUser('test@example.com')
    const message = new TestMessage()

    const sendCalls: any[] = []
    const mockSend = async (options: any) => {
      sendCalls.push(options)
      return options
    }

    facteur['_options'].channels.mail.send = mockSend
    facteur['_options'].channels.discord.send = mockSend

    await facteur.send({
      message,
      notifiable: user,
      params: { subject: 'Hello' },
      via: {
        discord: { webHookUrl: 'https://custom.webhook' }, // Custom target
      },
    })

    // Should send to both mail (default) and discord (custom target)
    assert.lengthOf(sendCalls, 2)

    const discordCall = sendCalls.find((call) => call.targets.webHookUrl)
    assert.exists(discordCall)
    assert.equal(discordCall.targets.webHookUrl, 'https://custom.webhook')
  })
})
