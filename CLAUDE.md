# Project rules for Claude

## Versioning

Every PR that ships user-visible or behavioral change must bump the patch
version in all four version sites together:

- `client/package.json` → `version`
- `client/src/app/config.ts` → `version`
- `workers/tarot-api/package.json` → `version`
- `workers/tarot-api/src/config.ts` → `WORKER_CONFIG.version`

Schema version (`WORKER_CONFIG.schemaVersion` in `workers/tarot-api/src/config.ts`)
follows the `YYYY.MM.DD-NN` scheme — bump the trailing `-NN` for same-day
revisions, or set the date to today with `-01` for a new day. Bumping it
re-runs the upgrade pipeline in `schema-upgrade-service.ts` (currently
idempotent: `runUserTraitsUpgrade`).

Keep the client and worker `version` values in lockstep — they're displayed
together in the dashboard ("v2.4.1") and used for compatibility checks.
