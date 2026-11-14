export interface NavigationItem {
  slug: string
  title: string
  icon?: string
  badge?: string
}

export interface NavigationSection {
  title: string
  items: NavigationItem[]
}

/**
 * Sidebar order and labels. Every docs page must appear here exactly once.
 */
export const navigation: NavigationSection[] = [
  {
    title: 'Getting started',
    items: [
      { slug: 'introduction', title: 'Introduction' },
      { slug: 'quick-start', title: 'Quick start' },
      { slug: 'configuration', title: 'Configuration' },
    ],
  },
  {
    title: 'Essentials',
    items: [
      { slug: 'notifications', title: 'Notifications' },
      { slug: 'bulk-sending', title: 'Bulk sending' },
      { slug: 'testing', title: 'Testing' },
    ],
  },
  {
    title: 'In-app',
    items: [
      { slug: 'in-app-notifications', title: 'In-app notifications' },
      { slug: 'server-api', title: 'Server API' },
      { slug: 'preferences', title: 'User preferences' },
      { slug: 'multi-tenancy', title: 'Multi-tenancy' },
    ],
  },
  {
    title: 'Frontend',
    items: [
      { slug: 'facteurjs-client', title: '@facteurjs/client', icon: 'simple-icons:typescript' },
      { slug: 'facteurjs-react', title: '@facteurjs/react', icon: 'simple-icons:react' },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { slug: 'adonisjs', title: 'AdonisJS', icon: 'simple-icons:adonisjs' },
      { slug: 'hono', title: 'Hono', icon: 'simple-icons:hono' },
    ],
  },
  {
    title: 'Channels',
    items: [
      { slug: 'database', title: 'Database', icon: 'lucide:database' },
      { slug: 'mail', title: 'AdonisJS Mail', icon: 'lucide:mail' },
      { slug: 'twilio', title: 'Twilio SMS', icon: 'simple-icons:twilio' },
      { slug: 'aws-sns', title: 'AWS SNS', icon: 'simple-icons:amazonaws' },
      { slug: 'webpush', title: 'Web Push', icon: 'lucide:bell-ring' },
      { slug: 'fcm', title: 'Firebase (FCM)', icon: 'simple-icons:firebase' },
      { slug: 'expo-notifications', title: 'Expo', icon: 'simple-icons:expo' },
      { slug: 'slack', title: 'Slack', icon: 'simple-icons:slack' },
      { slug: 'discord', title: 'Discord', icon: 'simple-icons:discord' },
      { slug: 'socketio', title: 'Socket.IO', icon: 'simple-icons:socketdotio' },
      { slug: 'transmit', title: 'Transmit (SSE)', icon: 'lucide:radio-tower' },
      { slug: 'webhook', title: 'Webhook', icon: 'lucide:webhook' },
      { slug: 'whatsapp', title: 'WhatsApp', icon: 'simple-icons:whatsapp', badge: 'Soon' },
    ],
  },
  {
    title: 'Digging deeper',
    items: [
      { slug: 'events', title: 'Events' },
      { slug: 'custom-channels', title: 'Custom channels' },
      { slug: 'custom-http-adapter', title: 'Custom HTTP adapter' },
    ],
  },
]

export const navigationItems = navigation.flatMap((section) =>
  section.items.map((item) => ({ ...item, section: section.title })),
)
