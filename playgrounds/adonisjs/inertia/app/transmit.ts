import { Transmit } from '@adonisjs/transmit-client'

export const transmit = new Transmit({ baseUrl: window.location.origin })
export const subscription = transmit.subscription('users/1')
await subscription.create()

console.log('Subscribed to channel:', subscription)
subscription.onMessage((message) => {
  console.log('Received message:', message)
})
