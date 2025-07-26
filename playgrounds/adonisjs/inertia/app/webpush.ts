async function initializeWebPush() {
  await navigator.serviceWorker.register('/web-push-sw.js', { scope: '/' })

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return

  const vapidPublicKey = import.meta.env.VITE_WEBPUSH_VAPID_PUBLIC_KEY

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidPublicKey,
  })

  console.log('[WebPush] Subscription:', JSON.stringify(subscription))

  /**
   * This `subscription` can be sent to the server and linked to a user.
   * This is the object that will be used to send push notifications.
   *
   * See models/user.ts
   */
}

initializeWebPush()
