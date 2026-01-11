# AdonisJS Mail Channel

The Mail channel allows you to send email notifications through the AdonisJS Mail service. This channel integrates seamlessly with your existing AdonisJS mail configuration and supports all mail drivers (SMTP, Mailgun, Resend, etc.).

## Batching

This channel does **not support batching**. Each email is sent individually.

## Configuration

```ts
import { defineConfig } from 'facteur'
import { mailChannel } from '@facteurjs/adonisjs/channels/mail'
import mail from '@adonisjs/mail/services/main'

export default defineConfig({
  channels: {
    mail: mailChannel({
      // Pass your AdonisJS mail service instance
      mailer: mail,
    })
  },
})
```

## Configuration Options

- **`mailer`** (required): Your AdonisJS Mail service instance

The mail channel uses your existing AdonisJS mail configuration. Make sure you have `@adonisjs/mail` configured in your application.

## Targets

The Mail channel requires an email address as the target:

```ts
await facteur
  .notification(MyNotification)
  .via({
    mail: {
      email: 'user@example.com'
    }
  })
  .send()
```

### Target Properties

- **`email`** (required): The recipient's email address

## Message Features

You can create mail notifications in two ways:

### Using MailMessage (Simple)

```ts
import { MailMessage } from '@facteurjs/adonisjs/channels/mail'

export default class OrderShippedNotification extends Notification {
  asMailMessage() {
    return MailMessage.create()
      .from('noreply@example.com')
      .subject('Your order has been shipped!')
      .htmlView('emails/order_shipped', {
        orderId: this.order.id,
        trackingNumber: this.order.trackingNumber,
      })
  }
}
```

### Using BaseMail (Full AdonisJS Mail Features)

For more complex emails, you can use AdonisJS Mail classes:

```ts
import { BaseMail } from '@adonisjs/mail'

class OrderShippedMail extends BaseMail {
  subject = 'Your order has been shipped!'

  prepare() {
    this.message
      .from('noreply@example.com')
      .htmlView('emails/order_shipped', {
        orderId: this.order.id,
      })
  }
}

export default class OrderShippedNotification extends Notification {
  asMailMessage() {
    return new OrderShippedMail()
  }
}
```

### Available Methods (MailMessage)

The `MailMessage` class extends AdonisJS `Message` class and supports all its methods:

- **`from(email, name?)`**: Set the sender
- **`to(email, name?)`**: Set the recipient (automatically set from targets)
- **`cc(email, name?)`**: Add CC recipient
- **`bcc(email, name?)`**: Add BCC recipient
- **`replyTo(email, name?)`**: Set reply-to address
- **`subject(subject)`**: Set the email subject
- **`html(content)`**: Set HTML content directly
- **`text(content)`**: Set plain text content
- **`htmlView(template, data)`**: Use an Edge template for HTML content
- **`textView(template, data)`**: Use an Edge template for text content
- **`attach(filePath, options?)`**: Attach a file
- **`attachData(content, options)`**: Attach content as a file
- **`embed(filePath, cid)`**: Embed an image for inline use
