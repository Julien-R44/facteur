self.addEventListener('push', function (event) {
  console.log('Push event received:', event)

  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (error) {
    console.error('Error parsing push event data:', error)
    data = { title: 'Test Notification', body: 'You received a push notification!' }
  }

  const options = {
    body: data.body || 'You received a push notification!',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    data: data.data || {},
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
  }

  self.registration.showNotification(data.title || 'Push Notification', options)
})

self.addEventListener('notificationclick', function (event) {
  console.log('Notification click:', event)

  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll().then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    }),
  )
})

self.addEventListener('notificationclose', function (event) {
  console.log('Notification closed:', event)
})
