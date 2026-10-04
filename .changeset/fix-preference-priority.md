---
'@facteurjs/core': patch
---

Respect global user channel opt-outs when resolving notification preferences, and isolate global and tenant notification preference objects so tenant changes do not mutate global preferences.
