# @facteurjs/adonisjs

## 2.1.0

### Minor Changes

- 86c75c7: Add opt-in security options to the webhook channel. The Slack and Discord channels accept them too.

  - `signingSecret` signs requests with [Standard Webhooks](https://www.standardwebhooks.com), using the `webhook-id`, `webhook-timestamp`, and `webhook-signature` headers. A `signingSecret` target sets the secret for one send, and `WebhookMessage.setId()` sets the `webhook-id`.
  - `httpsOnly` rejects non-https URLs before any request.
  - `followRedirects: false` refuses HTTP redirects.
  - `timeout` sets the request timeout in milliseconds.
  - `fetch` replaces the `fetch` function, for example with one that blocks SSRF.

  The AdonisJS package adds `channels.webhook()`, which creates the generic webhook channel.

### Patch Changes

- Updated dependencies [7dadcbc]
- Updated dependencies [86c75c7]
  - @facteurjs/core@2.2.0

## 2.0.2

### Patch Changes

- d97a7c1: Fix `facteur.db` being typed as `never` in `@facteurjs/adonisjs/services/main`. Add `interface NotificationsDatabase extends InferDatabase<typeof config> {}` to the `declare module` block of `config/notifications.ts` to type it from your config: available when `databaseAdapter` is set, `never` otherwise. Without this augmentation, `facteur.db` is typed as available and throws at runtime when no adapter is configured.
- Updated dependencies [ec492ce]
- Updated dependencies [d97a7c1]
- Updated dependencies [5da6472]
  - @facteurjs/core@2.1.0

## 2.0.1

### Patch Changes

- 142f450: Fix published packages: declare the Core runtime dependency on `@poppinss/utils`, include AdonisJS setup stubs at the expected path, and preserve channel types in generated AdonisJS declarations.
- Updated dependencies [142f450]
  - @facteurjs/core@2.0.1

## 2.0.0

### Minor Changes

- 72fa6f5: Add support for Expo Server SDK 4–7, Firebase Admin 14, Twilio 6, Kysely 0.29, Boringnode Transmit 0.4, Adonis Transmit 3, and Adonis Redis 11 while retaining all previously supported optional peer versions.

  No Facteur API migration or SDK upgrade is required. Applications choosing newer SDKs must follow their migration requirements: Expo 5 removes `useFcmV1` and changes `httpAgent` to an Undici `Dispatcher`; Expo 6+ and Kysely 0.29 are ESM-only. Adonis Redis 11 uses ioredis 6, which should not be shared with transports expecting an ioredis 5 client; use separate clients or transport configuration instead.

### Patch Changes

- 1130e79: Fix missing await on mailer.send() in mail channel
- 453903f: Add missing "to" attribute in config/notifications.stub frontmatter
- 5c51dfe: Add missing `./channels/mail` export to package.json
- 453903f: Fix TypeScript error where `kTargetSymbol` was missing from `MailChannel` type declarations due to bundler not correctly handling re-exports
- ad4f20a: Require Node.js >= 24
- 034c002: Remove leftover console.log in mail channel
- Updated dependencies [65e2de5]
- Updated dependencies [666436a]
- Updated dependencies [771d2b8]
- Updated dependencies [46ee77d]
- Updated dependencies [e5b0aee]
- Updated dependencies [1d97282]
- Updated dependencies [e9bc0bf]
- Updated dependencies [ad4f20a]
- Updated dependencies [72fa6f5]
- Updated dependencies [5da38e9]
- Updated dependencies [3f46e96]
  - @facteurjs/core@2.0.0

## 2.0.0-beta.8

### Patch Changes

- 1130e79: Fix missing await on mailer.send() in mail channel
- Updated dependencies [65e2de5]
- Updated dependencies [46ee77d]
- Updated dependencies [5da38e9]
  - @facteurjs/core@2.0.0-beta.2

## 2.0.0-beta.7

### Patch Changes

- 034c002: Remove leftover console.log in mail channel

## 2.0.0-beta.6

### Patch Changes

- ad4f20a: Require Node.js >= 24
- Updated dependencies [ad4f20a]
  - @facteurjs/core@2.0.0-beta.1

## 2.0.0-beta.4

### Patch Changes

- Add missing `./channels/mail` export to package.json

## 2.0.0-beta.3

### Patch Changes

- Fix TypeScript error where `kTargetSymbol` was missing from `MailChannel` type declarations due to bundler not correctly handling re-exports

## 2.0.0-beta.2

### Patch Changes

- Add missing "to" attribute in config/notifications.stub frontmatter

## 2.0.0-beta.1

### Patch Changes

- Fix stubs not found during package configuration

## 1.0.0-beta.0

### Major Changes

- First version

### Patch Changes

- Updated dependencies
  - @facteurjs/core@1.0.0-beta.0
