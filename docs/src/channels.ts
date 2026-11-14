import { navigationItems } from './navigation.ts'

/**
 * Channels shown in the introduction grid, by category. Names and icons
 * come from the sidebar navigation so both stay in sync.
 */
const groups = [
  {
    title: 'In-app',
    channels: [
      {
        slug: 'database',
        description: 'Store notifications with Knex or Kysely for an inbox and history.',
      },
    ],
  },
  {
    title: 'Email',
    channels: [{ slug: 'mail', description: 'Send emails through any AdonisJS Mail transport.' }],
  },
  {
    title: 'SMS',
    channels: [
      {
        slug: 'twilio',
        description: 'Phone numbers, messaging services and alphanumeric senders.',
      },
      { slug: 'aws-sns', description: 'SMS through Amazon Simple Notification Service.' },
    ],
  },
  {
    title: 'Push',
    channels: [
      {
        slug: 'webpush',
        description: 'Browser notifications over the Web Push protocol with VAPID.',
      },
      { slug: 'fcm', description: 'Mobile and web push through Firebase Cloud Messaging.' },
      {
        slug: 'expo-notifications',
        description: 'Push notifications for React Native apps built with Expo.',
      },
    ],
  },
  {
    title: 'Chat',
    channels: [
      { slug: 'slack', description: 'Post to Slack channels through incoming webhooks.' },
      { slug: 'discord', description: 'Post to Discord channels through webhooks.' },
      { slug: 'whatsapp', description: 'WhatsApp Business messages.' },
    ],
  },
  {
    title: 'Realtime',
    channels: [
      { slug: 'socketio', description: 'Push events to connected clients over WebSockets.' },
      { slug: 'transmit', description: 'Broadcast over Server-Sent Events with Transmit.' },
    ],
  },
  {
    title: 'HTTP',
    channels: [{ slug: 'webhook', description: 'Signed requests to any HTTP endpoint.' }],
  },
]

export const channelGroups = groups.map((group) => ({
  title: group.title,
  channels: group.channels.map((channel) => {
    const item = navigationItems.find((navigationItem) => navigationItem.slug === channel.slug)
    if (!item?.icon)
      throw new Error(`Channel "${channel.slug}" needs a navigation entry with an icon`)

    return { ...channel, title: item.title, icon: item.icon, badge: item.badge }
  }),
}))
