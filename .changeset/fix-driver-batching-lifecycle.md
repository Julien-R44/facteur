---
'@facteurjs/core': patch
---

Fix driver batching retries to resend only failed or unconfirmed messages, preserving confirmed successes across partial failures and driver sub-batches.

Restore `throwOnError` handling and per-notification `afterSend()` hooks and lifecycle events when using `useDriverBatching`.
