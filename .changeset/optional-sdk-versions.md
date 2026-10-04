---
'@facteurjs/core': minor
'@facteurjs/adonisjs': minor
---

Add support for Expo Server SDK 4–7, Firebase Admin 14, Twilio 6, Kysely 0.29, Boringnode Transmit 0.4, Adonis Transmit 3, and Adonis Redis 11 while retaining all previously supported optional peer versions.

No Facteur API migration or SDK upgrade is required. Applications choosing newer SDKs must follow their migration requirements: Expo 5 removes `useFcmV1` and changes `httpAgent` to an Undici `Dispatcher`; Expo 6+ and Kysely 0.29 are ESM-only. Adonis Redis 11 uses ioredis 6, which should not be shared with transports expecting an ioredis 5 client; use separate clients or transport configuration instead.
