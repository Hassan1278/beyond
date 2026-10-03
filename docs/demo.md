# Demo plan

Use a staging environment and fictional accounts/content. Reset demo data deliberately between rehearsals; do not reset production.

1. Open the website and an installed Android or iOS preview build.
2. Sign in as the same fictional user on both.
3. Save a short entry on one interface and read it on the other.
4. Show the reflection pending state, then deliver a reflection through the durable job pipeline using a short staging schedule.
5. Read and correct the reflection; confirm the correction appears on both clients.
6. Explicitly approve a memory, then remove it and confirm it is absent.
7. Delete an entry with pending work and show that no late reflection reappears.
8. Show a second fictional user cannot access the first user's content.

Prepare a screen recording for unreliable networking. Record the tested Git commit, API origin, native build IDs, and known gaps in the rehearsal notes. Core web/mobile behavior must match; visual details can differ by platform.
