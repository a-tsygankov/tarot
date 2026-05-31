# Handoff — 2026-05-31

Dashboard performance + correctness + structural cleanup. Five PRs landed in a
single day starting from `main` at v2.4.0, each on its own short-lived branch.
Final shipped version (in progress as of this handoff): **v2.4.4**.

## Architecture recap (current state)

- **Client** (Lit + TS, `client/src`). Root shell `ui/components/tarot-app.ts`.
  Admin dashboard component: `ui/components/dashboard-panel-lite.ts` (tag
  `<dashboard-panel>`). The legacy 1411-line `dashboard-panel.ts` was deleted.
- **Worker** (`workers/tarot-api/src`): Cloudflare Worker, R2-backed.
  - Handlers: `reading.ts`, `followup.ts`, `session.ts`, `admin-dashboard.ts`,
    `admin-users.ts`, `admin-migrate.ts`.
  - Repos: `user-repository.ts`, `game-repository.ts`, `user-traits-repository.ts`.
  - Services: `index-writer.ts` (materialized indexes),
    `schema-upgrade-service.ts`, **new** `entity-metadata.ts`,
    `request-timing.ts`, `r2-adapter.ts`.
- **Shared contracts**: `shared/contracts/api-contracts.ts`,
  `entity-contracts.ts`.

## PRs landed today

### PR #21 — Dashboard nav stack + 3d + indexed aggregation (v2.4.1) ⚠ broken in prod
- Client: nav stack with clickable breadcrumbs and a Back button; 3d range
  tab; removed Auto poll; 60s refresh cooldown with live countdown;
  indeterminate progress bar; deleted legacy `dashboard-panel.ts`.
- Worker: response cache (3-min TTL, `?force=1` bypass);
  `ctx.waitUntil(recordRequestTiming(...))` middleware writes per-request JSON
  under `analytics/request-timings/{date}/`; **refactored aggregation to use
  per-day indexes (`date-games`/`date-sessions`/`date-followups`)** — this is
  what broke production because the date indexes were never backfilled for
  historical entities, so the dashboard returned correct totals but empty
  Users/Sessions/Locations/Top-Languages panels.
- Schema bumped to `2026.05.31-01`.

### PR #22 — Hotfix: revert to full-table scans (v2.4.2)
- Reverted the v2.4.1 indexed aggregation to the prior `listDocuments`
  approach. Kept the cache, `?force=1`, `days=3` acceptance, request-timing,
  and all v2.4.1 client UI changes.
- Cache key now version-scoped (`cache/dashboard/{version}/days-{N}.json`) so
  a broken cache from a previous version can't be served.
- `recentGames` now shows the 20 most recent overall (not scope-limited).
- Schema → `2026.05.31-02`.

### PR #23 — Subrequest-limit fix + auto-refresh (v2.4.3)
- Worker: live dashboard was throwing `Too many API requests by single Worker
  invocation` because the full-table scan hit Cloudflare's 1000-subreq cap
  (49 users + 482 sessions + 189 games + ~220 turns + 49 traits ≈ 1000 GETs).
  Dropped the per-turn and user-traits scans:
  - `performance.avgResponseMs` / `providerBreakdown` → `0` / `{}`.
  - `users[].userTraits` → `{}` (lazy-loaded by the per-user detail endpoint).
  - `users[].followUpsInPeriod` / `sessions[].followUpCount` → `0`.
  - `totals.followUps.total` from `user.stats.totalFollowUps`,
    `totals.followUps.scope` from `DailySummary.followUps`.
- Client: dashboard auto-refreshes every **5 min** in the background; manual
  Refresh still works (60s cooldown) and resets the auto-refresh timer.
  `days` selection persisted in `localStorage` under `tarot_dashboard_days`.
- Cache TTL 3 → 5 min to match auto-refresh.
- Schema → `2026.05.31-03`.

### PR #24 — Docs: migration-script rule (no version bump)
- `CLAUDE.md`: any PR touching schema or introducing/changing an R2 index
  must ship a one-time migration that updates **all existing data, including
  historical**, not just data created after the change. Points future PRs at
  `schema-upgrade-service.ts` (auto pipeline, idempotent) and
  `/api/admin/reindex` in `admin-migrate.ts` (admin-triggered).

### PR #25 — customMetadata + list() + drop sessions + Readings tab (v2.4.4) — *current branch*
- **Storage:** every entity write now stamps R2 `customMetadata` (via new
  `services/entity-metadata.ts` + `r2-adapter.r2PutJsonWithMeta`). Centralized
  per-entity builders: `buildUserMetadata`, `buildSessionMetadata`,
  `buildGameMetadata`, `buildTurnMetadata`. Each stamps `metaV: '1'` so
  future migrations can detect old shapes. Values are stringified;
  non-ASCII fields are `encodeURIComponent`-ed.
- **Dashboard handler:** `admin-dashboard.ts` rewritten end-to-end to read
  via `listWithMetadata` (one subrequest per 1000 objects). Cold dashboard
  drops from ~1003 subrequests to ~12.
  - **Sessions removed as a first-class concept.** No `totals.sessions`, no
    `sessions[]` in the response, no `locations[].sessionCount`. Session info
    that mattered (e.g. `sessionId` per game) is still on the reading row.
  - **Readings elevated to first-class** with a new `readings[]` array
    (replaces the old `recentGames` + `sessions[]` overlap): every in-scope
    reading with user, question, location, language, follow-up count, time.
  - `performance.avgResponseMs`/`providerBreakdown` restored (turn metadata
    is now cheap to read).
  - `users[].followUpsInPeriod` restored (from scoped follow-up turns).
- **Client UI:**
  - Stat cards: Users / Readings / Follow-ups / Active Today / Avg Reading.
    Sessions card removed.
  - Tabs: Users / **Readings** / Locations. Sessions tab replaced by
    Readings tab.
  - Users tab table: no Sessions column; new "Recent Readings" column with
    drill-in.
  - Locations tab table: no Sessions column.
  - User detail panel: Sessions sub-panel removed; Readings table no longer
    shows a Session column.
  - Reading detail panel: Session shown as plain text (no longer clickable).
  - Location detail panel: Sessions table removed.
  - The session-detail render path is left in place (deep-link compat); UI
    no longer triggers `openDetail('session', ...)` anywhere.
- **Migration:** new `/api/admin/reindex {type:"metadata", prefix:"..."}`
  endpoint (`handlers/admin-migrate.ts: backfillMetadata`). Per the
  migration-script rule, the operator runs it once per prefix post-deploy:

  ```
  POST /api/admin/reindex {type:"metadata", prefix:"entities/users/"}
  POST /api/admin/reindex {type:"metadata", prefix:"entities/sessions/"}
  POST /api/admin/reindex {type:"metadata", prefix:"entities/games/"}
  POST /api/admin/reindex {type:"metadata", prefix:"entities/turns/"}
  ```

  Each pass is idempotent (objects whose customMetadata already has
  `metaV === '1'` are skipped). Until backfilled, dashboard panels for the
  un-migrated prefixes will appear empty — only entities written *after*
  v2.4.4 will surface. **The backfill is a required step of this rollout.**
- No schema-version bump (the metadata layer is index-like, not a schema
  change). Client + worker → **2.4.4**.

## Open items / not done today

- **Android photo-of-results bug** (separate from dashboard work): diagnosed
  as Chrome's transient-activation expiring while `exportBlob` builds the PNG
  before `navigator.share` is called. Fix deferred: pre-generate the blob on
  render so the click handler can call `share` synchronously, and fall
  through to `<a download>` on any share rejection (not only `AbortError`).
  Files: `client/src/ui/components/reading-display.ts:451-499`,
  `client/src/services/Export/ReadingImageExporter.ts:exportBlob`.
- **Cron-precompute for the dashboard** (Option #2 from the batching
  discussion) — would let us serve every dashboard request from a single
  R2 GET regardless of data volume. Not started.
- **D1 / aggregate-on-write** patterns discussed but deferred until growth
  warrants.

## Validation

- `tsc --noEmit` clean for both client and worker on the v2.4.4 branch.
- 46 client unit tests pass.
- Worker `prompts.test.ts` has 6 pre-existing failures unrelated to today's
  work (outdated call signatures / `SEEKER'S QUESTION` / `zodiac_sign`).
- UI verified visually for v2.4.1/v2.4.2/v2.4.3 via screenshots from the
  user; v2.4.4 not yet verified live (pending deploy + backfill).
