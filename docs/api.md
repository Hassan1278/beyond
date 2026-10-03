# Draft API contract

This is the proposed boundary for web/mobile work. No endpoints are implemented yet. Hassan and the API/shared owner confirm request/response shapes and limits before client tasks depend on them. Record changes here and in shared schemas together.

## Transport and identity

- API paths start with `/api`. Mobile's configured base URL is an origin without `/api`.
- JSON requests/responses use a consistent envelope: `data` on success; `error` with a stable `code`, safe `message`, and request ID on failure.
- Web uses verified Supabase cookies and checks origins for mutating requests. Mobile uses a verified bearer access token. Neither client supplies a trusted owner ID.
- Verify the authenticated user server-side; derive ownership from that identity. Keep database queries user-scoped and enforce RLS.
- Use UUID resource IDs and ISO-8601 UTC timestamps. List endpoints support bounded page sizes and an opaque cursor, returning the next cursor.
- `401` means authentication required, `400` validation failure, `409` revision conflict, `429` request limit, and `500` a safe server failure. Missing and other-user resources both return `404`.
- Mobile/browser cross-origin requirements must be explicit; permit configured browser origins and never use wildcard credentialed CORS.

## Routes

| Method | Path                         | Planned behavior                                                              |
| ------ | ---------------------------- | ----------------------------------------------------------------------------- |
| GET    | `/api/health`                | Public status without credentials or user data                                |
| POST   | `/api/entries`               | Validate text, save owned entry, atomically queue due reflection              |
| GET    | `/api/entries`               | Paginated current-user entries                                                |
| GET    | `/api/entries/:id`           | One owned entry                                                               |
| PATCH  | `/api/entries/:id`           | Update text with expected revision; invalidate stale jobs                     |
| DELETE | `/api/entries/:id`           | Delete owned entry and apply the agreed reflection/job/memory cleanup rules   |
| GET    | `/api/reflections`           | Paginated current-user reflections                                            |
| GET    | `/api/reflections/:id`       | One owned reflection                                                          |
| PATCH  | `/api/reflections/:id`       | Save user correction without overwriting the original generated letter        |
| GET    | `/api/memories`              | List explicitly approved memories                                             |
| POST   | `/api/memories`              | Explicitly approve a validated memory                                         |
| DELETE | `/api/memories/:id`          | Remove an approved memory                                                     |
| GET    | `/api/settings`              | Read timezone, reflection schedule, preferences                               |
| PATCH  | `/api/settings`              | Validate/update preferences and apply scheduling semantics                    |
| DELETE | `/api/account`               | Reauthenticate as appropriate, cancel jobs, delete owned data and auth record |
| POST   | `/api/internal/jobs/process` | Validate scheduler credential and process a bounded due batch                 |

## Resource shapes to implement

Entry: ID, text, revision, created/updated timestamps, and reflection scheduling state. Creation accepts text and an idempotency key; updates accept text and expected revision. Derive due time from the validated user schedule on the server.

Reflection: ID, entry ID, source revision, generated letter, optional correction, created timestamp. User correction is a distinct field.

Memory: ID, approved text, optional source reference, created timestamp. Suggestions cannot become approved memories implicitly.

Settings: validated IANA timezone, reflection timing preference, and the MVP's agreed toggles. Product limits, exact schedule values, and maximum payload lengths must be settled in foundation and placed in `packages/shared/src/constants/limits.ts`.

## First handoff

Implement portable schemas and types, the error envelope, a typed API client, and health response first. Web/mobile owners may use fictional contract-shaped fixtures while endpoint work proceeds. Keep fixtures outside production behavior. Add a real cross-client smoke check when the health endpoint is deployed.

Tests must cover invalid input, ownership, conflicting updates, repeated creates, edited/deleted pending jobs, and account deletion. Logs should include request/job IDs and safe error categories rather than journal content.
