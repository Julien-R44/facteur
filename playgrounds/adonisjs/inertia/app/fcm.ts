import { initializeApp } from 'firebase/app'
import { getToken, getMessaging, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: 'AIzaSyAjTo45LONn2V6tQthS036_LnXjjwE6wIM',
  authDomain: 'test-facteur.firebaseapp.com',
  projectId: 'test-facteur',
  storageBucket: 'test-facteur.firebasestorage.app',
  messagingSenderId: '448603236428',
  appId: '1:448603236428:web:fd7e54e66f0d2c13532ce9',
  measurementId: 'G-61T3WL3Z8S',
}

const app = initializeApp(firebaseConfig)
const messaging = getMessaging(app)

const vapidKey =
  'BPZqY4vO0RmmeA5goHwJw8nNcf4iUF_kdbK8-IBSB_Typo40TGe0MOLDjUcHJQk8NdP4TE48tKI2JKkVuG9a3HY'

async function initializeFCM() {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return

  const token = await getToken(messaging, { vapidKey })
  console.log('[FCM] Token:', token)

  onMessage(messaging, (payload) => {
    console.log('[FCM] Foreground message received:', payload)
    if (!payload.notification) return

    new Notification(payload.notification.title!, {
      body: payload.notification.body,
      icon: payload.notification.icon,
      data: payload.data,
    })
  })
}

initializeFCM()
