---
'@facteurjs/core': patch
---

`continueOnError(true)` now makes `send()` resolve with the result instead of rejecting for one recipient and for anonymous `via()` sends, like it already did for several recipients. Bulk sends with `continueOnError(true)` now keep each failed recipient's channel results and errors instead of returning an empty `results` entry. An explicit `throwOnError(true)` still rejects single and anonymous sends.
