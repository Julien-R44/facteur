---
'@facteurjs/hono': patch
---

Fix successful mark-as, mark-all, and preferences mutations returning 500 instead of 204 in Hono. Return empty bodies for 204, 205, and 304 responses while preserving JSON responses for other status codes.
