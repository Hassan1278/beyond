# Data handling

Journal content, reflections, and approved memories are personal data. The MVP keeps ownership explicit throughout the API, database, and job processor.

## Rules for implementation

- Require verified identity on all product endpoints and enable RLS on every user-data table. Test access using two different users.
- Use public Supabase credentials in clients. Restrict privileged credentials to audited server operations; do not use them for normal user queries.
- Retain memories only after explicit approval. Removing a memory prevents it from being used in later generation.
- Send the AI provider only content needed for the requested reflection. Keep prompts/results out of routine logs and analytics.
- Document the selected provider's actual retention/training settings before the beta; no provider is selected by this scaffold.
- Keep fictional content in fixtures, seeds, demos, and evaluations. Do not copy real user journals into Git or issue descriptions.
- Store mobile sessions with a reviewed secure-storage adapter. Handle its size/lifecycle constraints during implementation.

## Deletion contract

Entry deletion removes the entry, cancels pending jobs, and removes its dependent reflections. Confirm whether independently approved memories survive source deletion; the UI and backend must use the same rule and never restore deleted content from an in-flight job.

Account deletion removes all owned product data, cancels work, and deletes the auth record. Deleting an auth record and database content may require a retriable sequence; make it idempotent and test partial failure. Verify what hosted backups and external AI retention permit, and describe the resulting retention behavior accurately before beta.

## Environments

Keep development/staging data separate from production. Use separate Supabase projects and environment-specific credentials for hosted staging and production. Store secrets in hosting/provider secret stores; Git contains only variable names and dummy examples. Revoke an exposed credential rather than relying on a private repository to protect it.

## Acceptance tests

Cover unauthenticated access, user A accessing user B's identifiers, mobile and cookie authentication, memory removal, source deletion during processing, account deletion during processing, and logs that contain safe identifiers without journal text.
