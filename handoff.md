# Handoff — dev-7

Working branch: `dev-7` (cut from `dev`).

This document is updated **before** and **after** the implementation described below.

## Architecture recap (relevant slices)

- **Client**: Lit + TypeScript (`client/src`). Root shell `ui/components/tarot-app.ts`.
  - Card flow: `card-spread.ts` draws cards into `models/GameContext.ts`; `reading-display.ts`
    shows the AI reading; `followup-chat.ts` handles follow-up Q&A.
  - `services/ApiService.ts` → `POST /api/reading`, `POST /api/followup`.
  - Admin dashboard UI: `ui/components/dashboard-panel-lite.ts` (tag `<dashboard-panel>`,
    tabs: Users / Sessions / Locations + Recent Readings + drill-down detail views).
- **Worker** (`workers/tarot-api/src`): Cloudflare Worker, R2-backed.
  - Handlers: `reading.ts`, `followup.ts`, `session.ts`, `admin-dashboard.ts`, `admin-users.ts`.
  - Prompts: `prompts.ts` (`buildReadingPrompt`, `buildFollowUpPrompt`).
  - Repos: `user-repository.ts`, `game-repository.ts`; materialized indexes via
    `services/index-writer.ts` (`indexes/date-games/*`, `indexes/user-games/*`,
    `indexes/active-users/*`). Reindex in `handlers/admin-migrate.ts`.
- **Shared contracts**: `shared/contracts/api-contracts.ts`, `shared/contracts/entity-contracts.ts`,
  `shared/models/game-context.ts`.

## Tasks (with interpretations)

### Dashboard
1. **Hide zero-reading rows in the period.** Users/sessions with 0 readings *within the
   selected period* are excluded from the Users and Sessions tabs. (Locations already only
   list places that have games.)
2. **Add database indexes for time.** Fix the broken date-index readers
   (`date-games` and `active-users` were read with the wrong shape, so they always returned
   empty) and add date-bucketed indexes for sessions and follow-ups, wired into the
   session/followup handlers + reindex. Index entries carry `createdAt` (time).
3. **Separate columns for readings / questions / follow-ups.** Period-scoped counts shown as
   distinct columns in the Users and Sessions tabs.
4. **Admin aliases.** Admin can set an alias on a user. Stored server-side
   (`UserDocument.adminAlias`). Display rule: if the user has their own `name`, show
   `name / alias`; otherwise show the alias; otherwise the short uid.

### Gameplay — Clarification cards (scoped to single-card spreads)
5. For a single-card reading show a **Clarification** layout of two face-down cards. Revealing
   either draws a real card and **re-requests the reading**, with the prompt insisting on a
   clearer, more decisive answer that integrates the 1–2 clarification cards. The per-card
   `reading.cards` array stays limited to the original spread position; clarification meaning
   is folded into that interpretation + the overall synthesis.
6. **Same mechanic in the follow-up view** (single-card games): revealing a clarification card
   re-asks the most recent follow-up question (or a default "give a clearer answer" prompt)
   with the clarification card(s) in context.
7. Update `handoff.md` before and after (this file).

## Implementation plan / files

- Shared: `api-contracts.ts` (`GameContextPayload.clarificationCards`),
  `entity-contracts.ts` (`UserDocument.adminAlias`, `GameDocument.clarificationCards`),
  `models/game-context.ts` (`IGameContext.clarificationCards`).
- Client: new `app/deck.ts` (card pool + `drawRandomCard`); `models/GameContext.ts`
  (clarification state + payload); new `ui/components/clarification-cards.ts`;
  `reading-display.ts` + `followup-chat.ts` integration; `dashboard-panel-lite.ts`
  (columns, alias editor, alias-aware labels); `ApiService.ts` no signature change.
- Worker: `prompts.ts` (clarification instruction), `reading.ts` + `followup.ts`
  (clarification section + best-effort persistence), `game-repository.ts`
  (`clarificationCards`), `user-repository.ts` (`setAlias`),
  `services/index-writer.ts` (date session/followup indexes), `handlers/admin-dashboard.ts`
  (zero-reading filter, period counts, alias, fixed index readers),
  `handlers/admin-users.ts` (alias endpoint + alias in detail),
  `handlers/admin-migrate.ts` (reindex new indexes), `index.ts` (alias route).

## Status — DONE

All tasks implemented on `dev-7`. Summary of what landed:

### Gameplay — clarification cards
- Shared: `GameContextPayload.clarificationCards?`, `IGameContext.clarificationCards`,
  `GameDocument.clarificationCards?`.
- New `client/src/app/deck.ts` (card pool + `drawRandomCard`); `card-spread.ts` now uses it.
- `GameContext`: `clarificationCards`, `canAddClarification` (single-card + <2),
  `usedCardNames()`, `addClarificationCard()`; included in `toApiPayload`,
  `toPromptContext`, `normalizeCards`, `reset`.
- New `clarification-cards.ts` component (two slots; next slot tappable; emits `reveal`).
- `reading-display.ts`: shows clarification layout for single-card readings; revealing draws a
  card and **re-requests the reading** (`_clarifying` spinner).
- `followup-chat.ts`: shows the same layout for single-card games while turns remain; revealing
  re-asks the last question (or a default "clearer answer" prompt) with the card in context.
- Worker: `PROMPTS.clarificationInstruction`; `reading.ts` + `followup.ts` append a
  `CLARIFICATION CARDS:` block + the instruction when present; `game-repository.ts`
  (`createGame`/`applyReading`) persist `clarificationCards`. The oracle is told to keep
  `reading.cards` limited to the original spread position and fold clarification into the
  per-card text + overall synthesis (keeps the UI's card-to-reading mapping intact).

### Dashboard
- **Zero-reading filter**: `admin-dashboard.ts` drops users with `readingsInPeriod === 0` and
  sessions with `gameCount === 0` (period-scoped).
- **Separate columns**: Users tab → Readings / Questions / Follow-ups (period counts);
  Sessions tab → Readings / Questions / Follow-ups + Device. Server adds
  `readingsInPeriod`, `questionsInPeriod`, `followUpsInPeriod` (users) and `followUpCount`
  (sessions), aggregating follow-up turns by uid and by session.
- **Aliases**: `UserDocument.adminAlias`; `user-repository.setAlias()`; endpoint
  `POST /api/admin/user/:uid/alias` (`handleAdminSetUserAlias` + route in `index.ts`); alias
  surfaced in dashboard/user/session/location/game responses. Client label rule
  `userLabel(name, uid, alias)` → `name / alias` when both, else whichever, else short uid;
  user-detail view has an alias editor (Save/Clear).
- **Time indexes**: fixed the `date-games` and `active-users` dashboard readers (they read the
  wrong shape and always returned empty → `recentGames`/`activeUsersToday` now work). Added
  `indexes/date-sessions/*` and `indexes/date-followups/*` (entries carry `createdAt`), wired
  into `session.ts` / `followup.ts`, with a `date-sessions` reindex path.

### Notes / follow-ups
- Clarification scope: the **reading screen** offers clarification for **single-card** spreads
  only (matches "For a single card"); the **follow-up view** offers it for **any** spread
  (1/3/5), so "same applies to any follow up questions" holds regardless of spread size.
  `GameContext.canAddClarification` only gates on the 2-card limit; the spread-type gate lives
  in each view (reading-display renders it for `spreadType === 1`; followup-chat for all).
- Re-requesting a reading (clarification, or the pre-existing language/tone change path) reuses
  the same `gameId`, so it does not create extra game docs; per-user `stats.totalReadings` can
  still over-count re-requests (pre-existing behaviour, left as-is).
- Verified: `tsc --noEmit` clean (client + worker), `vite build` OK, client tests 46/46.
  Worker `prompts.test.ts` has 6 **pre-existing** failures (outdated call signatures /
  `SEEKER'S QUESTION` / `zodiac_sign` expectations) unrelated to this change.
- UI not exercised in a real browser in this environment.
