---
'@facteurjs/core': patch
---

`createFacteur()` now accepts a top-level `databaseAdapter` and types `facteur.db` from it instead of `never`. `InferChannelsFromConfig` also works with database-backed instances.
