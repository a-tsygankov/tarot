# Migration plan: GitHub Pages → Cloudflare (client hosting)

Status: **draft / not started**. No code or infra changes yet — this document captures the plan, the manual steps, and the risks so we can execute it deliberately.

---

## 1. Current state (verified against the repo)

- **Client:** GitHub Pages at `https://a-tsygankov.github.io/tarot/`
  - Base path `/tarot/` (`client/vite.config.ts`)
  - No custom domain, no `CNAME` file
  - Built and deployed by `.github/workflows/deploy.yml` → `deploy-client` job
- **API worker:** `tarot-api` at `https://tarot-api.tarotoracle.workers.dev`
  - `tarotoracle.workers.dev` is the account's *workers.dev* subdomain — **not** a real custom domain
  - Deployed by `.github/workflows/deploy.yml` → `deploy-worker`
- **TTS assets worker:** `tts-assets` at `https://tarot-tts-assets.tarotoracle.workers.dev`
  - Deployed by `.github/workflows/deploy.yml` → `deploy-tts-assets`
- **CORS** in `workers/tarot-api/wrangler.toml`:
  ```
  ALLOWED_ORIGINS = "https://a-tsygankov.github.io,https://a-tsygankov.github.io/tarot,http://localhost:3000"
  ```
- **GitHub repo secrets in use:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- **Worker secrets** (set via `wrangler secret put`, not in repo):
  `GEMINI_KEY`, `ANTHROPIC_KEY`, `ELEVENLABS_KEY`, `ANALYTICS_KEY`, `DEFAULT_ELEVENLABS_VOICE_ID`

---

## 2. Recommended target

**Cloudflare Pages** (project name `tarot`), deployed by a new GitHub Actions job using `wrangler pages deploy client/dist`.

Two URL variants — decide before Phase 2:

| Option | Client URL | API URL | CORS needed? | DNS work? |
|---|---|---|---|---|
| **A. Custom domain (recommended if you own one)** | `https://tarot.yourdomain.com` (Pages custom domain) | `https://api.yourdomain.com` (Worker route on same root) | No (same root) or yes (subdomain split) | Yes |
| **B. No custom domain** | `https://tarot.pages.dev` | unchanged `tarot-api.tarotoracle.workers.dev` | Yes — add `tarot.pages.dev` to `ALLOWED_ORIGINS` | None |

**Why Pages over Worker Static Assets:** simpler for an SPA, native `_redirects` / `_headers`, automatic preview deploys per PR, no restructuring of the API worker. Tradeoff: still two deploy units (Pages + Worker) — fine, that's already the case.

---

## 3. Phased execution

### Phase 1 — Stand up Cloudflare Pages in parallel (no user-visible change)
1. Create CF Pages project `tarot` in the Cloudflare dashboard (Direct Upload mode — we keep the GH Actions pipeline rather than wiring CF's Git integration).
2. Add a new `deploy-client-pages` job to `.github/workflows/deploy.yml` mirroring the current `deploy-client` (install → typecheck → test → build → `wrangler pages deploy client/dist --project-name=tarot`).
3. **Build change:** make `base` conditional in `client/vite.config.ts`:
   ```ts
   base: process.env.DEPLOY_TARGET === 'pages' ? '/' : '/tarot/'
   ```
   Set `DEPLOY_TARGET=pages` in the new job. GitHub Pages job keeps `/tarot/` during overlap.
4. Add `client/public/_redirects` with `/* /index.html 200` so SPA deep links resolve on Pages.
5. Validate `tarot.pages.dev` end-to-end (load, run a reading, follow-up, TTS) **after** Phase 2 step 6.

### Phase 2 — Cut CORS & API URL over
6. Update `ALLOWED_ORIGINS` in `workers/tarot-api/wrangler.toml` to include the new origin (`https://tarot.pages.dev` and/or the custom domain). Keep the github.io entries during overlap; remove later.
7. **Custom-domain path only (Option A):** add Worker routes `api.yourdomain.com/*` → `tarot-api` and `assets.yourdomain.com/*` → `tts-assets`; then update `client/src/app/config.ts`:
   - `apiBase` → `https://api.yourdomain.com`
   - `tts.piper.assetBase` → `https://assets.yourdomain.com`
   No-custom-domain path: leave the workers.dev URLs as-is.

### Phase 3 — Redirect GitHub Pages
8. Replace the `deploy-client` GH Pages job artifact with a **redirect-only build**:
   - `index.html` with a path-preserving JS redirect + `<meta http-equiv="refresh">` fallback
   - `404.html` doing the same (so deep links like `/tarot/<anything>` forward correctly)
9. Keep the redirect site live indefinitely (Pages is free) so old links never break.

### Phase 4 — Cleanup
10. Remove github.io entries from `ALLOWED_ORIGINS` after a grace period (~30 days).
11. Optionally delete the `deploy-client` GH Pages job from `deploy.yml` if you decide not to maintain even the redirect site.

---

## 4. Manual actions required (not in code)

### Cloudflare dashboard
- [ ] Create Pages project `tarot` (Direct Upload).
- [ ] **Verify `CLOUDFLARE_API_TOKEN` scope includes `Cloudflare Pages: Edit`** — current token is scoped for Workers; this is the most-likely-missed gotcha. Either widen the existing token or add a new one (see secrets section).
- [ ] (Option A only) Add domain to Cloudflare, create Pages custom domain `tarot.yourdomain.com`, add Worker routes for `api.*` and `assets.*`.

### GitHub repo
- [ ] **Secret update — choose one:**
  - **Widen existing token:** edit `CLOUDFLARE_API_TOKEN` to also include `Account → Cloudflare Pages: Edit`. No workflow change.
  - **Or add a separate token:** create new repo secret `CLOUDFLARE_PAGES_API_TOKEN`, and reference it in the new `deploy-client-pages` job. Cleaner blast-radius isolation.
- [ ] No other new secrets needed.
- [ ] Repo Settings → Pages: leave enabled through Phases 1–3 (still serves the redirect site). Disable only if Phase 4 step 11 is taken.

### Worker secrets
- [ ] **No change.** `GEMINI_KEY`, `ANTHROPIC_KEY`, `ELEVENLABS_KEY`, `ANALYTICS_KEY`, `DEFAULT_ELEVENLABS_VOICE_ID` stay on `tarot-api` exactly as they are — Cloudflare Pages doesn't touch them.

---

## 5. Important issues to be aware of

### Service Worker scope (highest-risk item)
`client/public/piper-sw.js` is registered at the current base path. Service Workers are scope-locked to the path they were registered from. **Users with the GH Pages SW already cached will keep hitting the old origin** even after we redirect.

Mitigations (use both):
- Bump the SW version string and add `self.registration.unregister()` to the GH-Pages-served SW so old installs self-clean on next visit.
- Add `Clear-Site-Data: "cache","storage"` header on the redirect `index.html` (via `_headers` if we host the redirect on Pages, or a `<meta>` tag for GH Pages).

### `base: '/tarot/'` → `'/'`
Anything hardcoding `/tarot/` instead of using `BASE_URL` will break. Quick check before Phase 1 step 3:
```
grep -rn "/tarot/" client/src --include='*.ts' --include='*.html'
```
Currently only `BASE_URL`-derived references are visible; verify before flipping.

### PWA manifest
`client/public/manifest.json` — check `start_url`, `scope`, and `icons[].src`. They should be `BASE_URL`-relative; verify they resolve correctly under both base paths during Phase 1.

### Asset hashing across deploys
Vite hashes filenames. If a user has the GH Pages `index.html` open mid-cutover and clicks something that lazy-loads a chunk, they'll get a chunk-load error. This is **already true on every deploy today** — not worse, just worth knowing.

### LocalStorage / cookies
Changing origin (e.g., `a-tsygankov.github.io` → `tarot.pages.dev` or your custom domain) means **users lose saved preferences and reading history** on first visit to the new URL. Acceptable for a tarot app; mention in a release note if you care.

### Analytics / observability
The worker's request logs will start showing a new `Origin` header after cutover. Update any dashboards that filter on origin.

### CORS during overlap
During Phase 2, `ALLOWED_ORIGINS` must include **both** the old (github.io) and new origins. The current value is a comma-separated string parsed in the worker — verify the parser handles a longer list correctly before adding entries.

---

## 6. Rollback

Through Phases 1–2, GitHub Pages stays live and untouched — rollback is "do nothing, users keep using the old URL." Only Phase 3 (the redirect) is user-visible. To roll back from Phase 3:
1. Revert the `deploy-client` job to the previous artifact (restore from git).
2. Push to main — GH Pages serves the old SPA again within ~1 min.
3. Pages stays up the whole time as a fallback.

---

## 7. Open questions for the owner

1. **Custom domain or `tarot.pages.dev`?** Drives whether DNS work and same-origin restructuring are in scope (Option A vs B in §2).
2. **Keep the GH Pages redirect site permanently, or sunset after N months?** Affects Phase 4 step 11.
3. **Start with Phase 1 only** (parallel deploy on `*.pages.dev`, no user-visible change) so you can validate before cutover, or roll all four phases together?
