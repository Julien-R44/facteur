---
summary: A TypeScript-first notification library for Node.js. Define once, deliver across channels, and build your own in-app notification center.
---

<!-- prettier-ignore -->
```ts
import { facteur } from './facteur.js'
import InvoicePaidNotification from './invoice_paid_notification.js'

// One notification. All your configured channels.
await facteur
  .notification(InvoicePaidNotification)
  .to(user)
  .params({ amount: 100 })
  .send()
```
