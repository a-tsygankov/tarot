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

## Migrations for schema and index changes

Any PR that changes the schema (entity shape) or introduces / changes an
R2 index must ship a one-time migration script that updates **all existing
data, including historical** — not just data created after the change.

- Schema migrations: add a step to `runUserTraitsUpgrade` (or equivalent)
  in `workers/tarot-api/src/services/schema-upgrade-service.ts`. The
  pipeline runs automatically when `WORKER_CONFIG.schemaVersion` is bumped.
  The migration must be idempotent (safe to re-run).
- Index migrations: extend `/api/admin/reindex` in
  `workers/tarot-api/src/handlers/admin-migrate.ts` so the new index type
  can be rebuilt from entity data, and trigger it as part of the rollout.

A new index that only fills on subsequent writes is a known footgun (see
the v2.4.1 dashboard breakage, where date-based indexes were empty for
historical entities and the dashboard collapsed to empty scope tables).
