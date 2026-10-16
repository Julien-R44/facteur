---
'@facteurjs/core': minor
'@facteurjs/adonisjs': minor
---

Add opt-in security options to the webhook channel. The Slack and Discord channels accept them too.

- `signingSecret` signs requests with [Standard Webhooks](https://www.standardwebhooks.com), using the `webhook-id`, `webhook-timestamp`, and `webhook-signature` headers. A `signingSecret` target sets the secret for one send, and `WebhookMessage.setId()` sets the `webhook-id`.
- `httpsOnly` rejects non-https URLs before any request.
- `followRedirects: false` refuses HTTP redirects.
- `timeout` sets the request timeout in milliseconds.
- `fetch` replaces the `fetch` function, for example with one that blocks SSRF.

The AdonisJS package adds `channels.webhook()`, which creates the generic webhook channel.
