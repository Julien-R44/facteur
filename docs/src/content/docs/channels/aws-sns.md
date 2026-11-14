# AWS SNS Channel

The AWS SNS channel allows you to send SMS notifications through Amazon Simple Notification Service (SNS). This channel uses the AWS SDK (`@aws-sdk/client-sns`).

## Batching

This channel does **not support batching**. Each SMS is sent individually.

## Configuration

```ts
import { createFacteur } from '@facteurjs/core'
import { awsSnsChannel } from '@facteurjs/core/channels/aws-sns'

export const facteur = createFacteur({
  discoverer: { searchDirectory: new URL('./notifications/', import.meta.url) },
  channels: {
    awsSns: awsSnsChannel({
      // Required: AWS credentials
      region: 'us-east-1',
      accessKeyId: 'your-access-key-id',
      secretAccessKey: 'your-secret-access-key',

      // Optional: Session token (for temporary credentials)
      sessionToken: 'your-session-token',
    }),
  },
})
```

## Configuration Options

- **`region`** (required): AWS region (e.g., `'us-east-1'`, `'eu-west-1'`)
- **`accessKeyId`** (required): AWS access key ID
- **`secretAccessKey`** (required): AWS secret access key
- **`sessionToken`** (optional): AWS session token for temporary credentials

### AWS Credentials

The current channel explicitly constructs AWS credentials from `accessKeyId` and `secretAccessKey` (plus an optional STS session token). It does not use the SDK's default IAM role credential chain. Load credentials from your environment or secret manager, not committed source files.

Make sure your IAM policy includes the `sns:Publish` permission.

## Targets

The AWS SNS channel requires a phone number in E.164 format:

```ts
await facteur
  .notification(MyNotification)
  .via({
    awsSns: {
      // Phone number in E.164 format (required)
      to: '+14155552671',
    },
  })
  .send()
```

### Target Properties

- **`to`** (required): The recipient's phone number in E.164 format (e.g., `+14155552671`)
- `senderId` exists in the target type but is not forwarded to SNS by the current implementation.

### E.164 Format

Phone numbers must be in E.164 format:

- Start with `+`
- Country code (e.g., `1` for US, `33` for France)
- Phone number without spaces or dashes

Examples:

- US: `+14155552671`
- UK: `+447911123456`
- France: `+33612345678`

## Message Features

When creating notifications for AWS SNS, you set the SMS content:

```ts
import { Notification } from '@facteurjs/core/types'
import { AwsSnsMessage } from '@facteurjs/core/channels/aws-sns'

export default class SmsNotification extends Notification<undefined> {
  asAwsSnsMessage() {
    return AwsSnsMessage.create().setMessage('Your verification code is: 123456')
  }
}
```

### Available Methods

- **`setMessage(message)`**: Set the SMS message content

## SMS Limits

Be aware of AWS SNS SMS limits:

- SMS messages are limited to 160 characters for GSM encoding
- Longer messages are split into multiple segments (up to 1600 characters)
- Pricing varies by destination country
- Some countries require pre-registered sender IDs
