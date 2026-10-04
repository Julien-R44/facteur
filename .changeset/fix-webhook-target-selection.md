---
'@facteurjs/core': patch
---

Fix Webhook, Slack, and Discord target selection to send only to named webhooks explicitly enabled with true. Reject unknown enabled names before sending, while preserving empty selections and explicit webhookUrl overrides.
