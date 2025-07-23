import { Transmit } from '@adonisjs/transmit-client'

export const transmit = new Transmit({ baseUrl: window.location.origin })
export const subscription = transmit.subscription('users/1')
await subscription.create()

subscription.onMessage((message) => {
  console.info('Received message:', message)
})
