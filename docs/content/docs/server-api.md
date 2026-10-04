# Server API

Facteur registers five HTTP routes for database notifications and preferences. Configure a top-level `databaseAdapter` and discover your notification classes before serving preference requests. See [Hono](./integrations/hono.md), [AdonisJS](./integrations/adonisjs.md), or [Custom HTTP Adapter](./deep/custom-http-adapter.md) to register them.

## Authorization is required

Every route calls `authorize` with `notifiableId`, `tenantId` and the request. Returning `false` responds with `403 { "error": "Unauthorized" }`. Authenticate the caller and check that they can access the requested user and tenant; IDs provided by the client are not proof of access. Do not use an always-true callback outside a disposable local demo.

**Current security limitation:** `mark-as` authorizes the notifiable ID in the URL, then updates the row by `notificationId` alone. The built-in database adapters do not constrain this update by owner or tenant. Checking only the URL user in `authorize` does **not** prevent updating another user's notification. Before exposing this route, add an ownership/tenant check for the body’s `notificationId` in your authorization logic or replace the route with a scoped update. The frontend SDK and React mutation hooks use this same route.

Also, omitting `tenantId` from notification list/mark-all requests does not filter to rows with a null tenant; the built-in adapters operate across that user's tenants. Require and validate a tenant where your application needs tenant isolation.

## Routes

All paths below start with `/notifications/notifiable/:notifiableId`.

| Method | Suffix           | Inputs                                                                         | Success response              |
| ------ | ---------------- | ------------------------------------------------------------------------------ | ----------------------------- |
| GET    | `/notifications` | Query: `page`, `limit`, `status`, `tenantId`, `tags`                           | `200`, array of notifications |
| POST   | `/mark-as`       | JSON: `notificationId`, `status`; authorization also reads optional `tenantId` | `204`                         |
| POST   | `/mark-all`      | JSON: `status`, optional `tenantId`                                            | `204`                         |
| GET    | `/preferences`   | Query: optional `tenantId`                                                     | `200`, preferences object     |
| POST   | `/preferences`   | JSON: `preferences`, optional `tenantId`, `notificationName` or `category`     | `204`                         |

Pagination defaults to page 1 and 10 items, with a maximum limit of 100. The response is an array, not an envelope with a total count. Notifications are sorted by `created_at` descending. `tags` is a JSON-encoded array, for example `tags=["billing"]` (URL-encode it in requests).

Use `'read'` or `'seen'` for mark requests. Listing supports `'read'`, `'seen'`, `'unread'` and `'unseen'`. The current mark handlers check that required fields exist but do not validate status values, so validate incoming statuses in your application.

Preference updates require a flat channel-to-boolean map. `notificationName` should use the stable notification identifier. `notificationName` and `category` are mutually exclusive; invalid preference values or unknown categories return `400`. Category updates write preferences for each currently discovered notification in that category, not a persistent category rule for future classes.

See [User Preferences](./user-preferences.md) for the response structure and resolution limitations, and [Frontend SDK](./sdks/frontend-sdk.md) for typed client calls.
