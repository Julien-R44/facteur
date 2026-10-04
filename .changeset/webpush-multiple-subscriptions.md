---
'@facteurjs/core': minor
---

Support arrays of Web Push subscriptions to notify all of a user's devices with one Facteur send. Preserve single-subscription behavior and the default `WebpushTargets` typing; explicitly typed arrays can use `WebpushTargets<WebpushSubscription[]>`. Attempt every device before reporting aggregated delivery errors and retain provider error details as the cause.
