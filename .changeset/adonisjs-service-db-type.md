---
'@facteurjs/adonisjs': patch
---

Fix `facteur.db` being typed as `never` in `@facteurjs/adonisjs/services/main`. Add `interface NotificationsDatabase extends InferDatabase<typeof config> {}` to the `declare module` block of `config/notifications.ts` to type it from your config: available when `databaseAdapter` is set, `never` otherwise. Without this augmentation, `facteur.db` is typed as available and throws at runtime when no adapter is configured.
