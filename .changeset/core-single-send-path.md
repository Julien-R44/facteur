---
'@facteurjs/core': minor
---

One recipient, several recipients and anonymous `via()` sends now go through the same send path, so every builder option behaves the same whatever the number of recipients.

Behavior changes for sends to two or more recipients:

- `.retries()` and `.timeout()` now apply to each channel send, like they already did for a single recipient. Only the failing channel is retried, so an already successful channel is no longer sent twice. Lifecycle hooks such as `beforeSend()` and channel/preference resolution are no longer retried or covered by the timeout.
- `.continueOnError()` combined with an explicit `.throwOnError(true)` now stops on the first failing recipient, like it already did for a single recipient. This also applies with `.useDriverBatching()`.
- `.onProgress()` now also counts recipients that fail before channel sending, so it always reaches the total.
- `.onProgress()` and `.useDriverBatching()` now also apply to one-recipient and anonymous sends.
