// @ts-nocheck
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyAjTo45LONn2V6tQthS036_LnXjjwE6wIM',
  authDomain: 'test-facteur.firebaseapp.com',
  projectId: 'test-facteur',
  storageBucket: 'test-facteur.firebasestorage.app',
  messagingSenderId: '448603236428',
  appId: '1:448603236428:web:fd7e54e66f0d2c13532ce9',
  measurementId: 'G-61T3WL3Z8S',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload)

  const notificationTitle = payload.notification?.title || 'New Notification'
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    tag: 'fcm-notification',
    data: payload.data || {},
    requireInteraction: true,
  }

  console.log('[SW] Showing notification:', notificationTitle, notificationOptions)

  return self.registration.showNotification(notificationTitle, notificationOptions)
})

self.addEventListener('push', (event) => {
  console.log('[SW] Raw push event received:', event)
  if (!event.data) return

  try {
    const data = event.data.json()
    console.log('[SW] Push data parsed:', data)
  } catch {
    console.log('[SW] Push data text:', event.data.text())
  }
})
