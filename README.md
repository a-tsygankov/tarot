# Tarot Oracle v2

AI-powered tarot reading app with voice, multiple card decks, and multi-language support.

- **Client**: TypeScript + Vite + Lit Web Components, deployed to GitHub Pages
- **API Worker**: Cloudflare Worker with R2 storage, deployed via Wrangler
- **AI Providers**: Gemini (primary) + Anthropic (fallback)
- **TTS**: ElevenLabs with browser fallback

Live: https://a-tsygankov.github.io/tarot/

---

## Repository Structure

```
tarot/
  client/             # Vite + Lit frontend
    src/
      app/            # Config, composition root, diagnostics
      models/         # UserContext, GameContext
      services/       # ApiService, TTS, STT, versioning
      ui/components/  # Lit web components (app shell, cards, settings, etc.)
      ui/styles/      # Themes, shared styles
    public/icons/     # Favicon and app icons
    index.html        # Vite entry point
  workers/tarot-api/  # Cloudflare Worker API
    src/
      handlers/       # Route handlers (reading, followup, tts, session, etc.)
      services/       # AI router, Gemini, Anthropic, response parser
      repositories/   # R2 data access
      middleware/     # Rate limiter, validation
  shared/             # Shared types between client and worker
  dev.sh              # Local dev startup script
```

---

## Local Development

### Prerequisites

- Node.js 22+
- npm

### First-time setup

```bash
# Install dependencies
cd client && npm ci && cd ..
cd workers/tarot-api && npm ci && cd ..

# Configure worker secrets for local dev
cp workers/tarot-api/.dev.vars.example workers/tarot-api/.dev.vars
# Edit .dev.vars and add your API keys (at minimum GEMINI_KEY)
```

### `.dev.vars` file

```env
GEMINI_KEY=your-gemini-api-key
ANTHROPIC_KEY=your-anthropic-api-key       # optional, Gemini is primary
ELEVENLABS_KEY=your-elevenlabs-api-key     # optional, for TTS
ANALYTICS_KEY=your-analytics-key           # optional
DEFAULT_VOICE_ID=MKlLqCItoCkvdhrxgtLv      # ElevenLabs voice ID
```

The AI router will **skip providers without keys** gracefully. At minimum you need `GEMINI_KEY` for readings to work.

### Start dev environment

```bash
./dev.sh
```

This starts both servers and cleans up on Ctrl+C:
- **Vite client**: http://localhost:3000/tarot/ (with hot reload)
- **Wrangler worker**: http://localhost:8787 (local R2, local secrets from `.dev.vars`)

The Vite dev server proxies `/api/*` requests to the local wrangler, so the client talks to your local worker automatically.

### Individual commands

```bash
# Client only
cd client && npm run dev

# Worker only
cd workers/tarot-api && npx wrangler dev

# Type check
cd client && npx tsc --noEmit
cd workers/tarot-api && npx tsc --noEmit

# Tests
cd client && npm test
```

---

## Production Deployment

### Client (GitHub Pages)

Deployed automatically on push to `main` when files in `client/` or `shared/` change.

The GitHub Actions workflow (`.github/workflows/deploy.yml`):
1. Installs dependencies (`npm ci`)
2. Type-checks (`tsc --noEmit`)
3. Runs tests (`vitest run`)
4. Builds (`vite build`)
5. Deploys to GitHub Pages

**GitHub Pages setup**: In repo Settings > Pages > Source, select **"GitHub Actions"** (not "Deploy from a branch").

### Worker (Cloudflare Workers)

Deployed automatically on push to `main` when files in `workers/` or `shared/` change.

Requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets in the GitHub repo (see [Setting up Cloudflare API Token](#setting-up-cloudflare-api-token) below).

Manual deployment:

```bash
cd workers/tarot-api
npx wrangler deploy
```

---

## Managing Secrets

### Worker secrets (Cloudflare)

Secrets are set once and **persist across deployments**. You do NOT need to re-set them after each deploy.

```bash
cd workers/tarot-api

# Set or update a secret
npx wrangler secret put GEMINI_KEY
npx wrangler secret put ANTHROPIC_KEY
npx wrangler secret put ELEVENLABS_KEY
npx wrangler secret put ANALYTICS_KEY
npx wrangler secret put DEFAULT_VOICE_ID

# List configured secrets
npx wrangler secret list
```

### Required secrets

| Secret | Required | Purpose |
|--------|----------|---------|
| `GEMINI_KEY` | Yes | Primary AI provider (Google Gemini) |
| `ANTHROPIC_KEY` | No | Fallback AI provider (Claude) |
| `ELEVENLABS_KEY` | No | Text-to-speech |
| `ANALYTICS_KEY` | No | Analytics |
| `DEFAULT_VOICE_ID` | No | Default ElevenLabs voice |

The AI router checks for key existence before calling each provider. If a key is missing, that provider is skipped with a log message rather than making a failing HTTP request.

### Updating keys

If you need to rotate an API key:

```bash
# Update in production
cd workers/tarot-api
npx wrangler secret put GEMINI_KEY
# Paste new key when prompted

# Update locally
# Edit workers/tarot-api/.dev.vars with the new key
```

No redeployment is needed after updating secrets in production.

---

## Setting up Cloudflare API Token

The GitHub Actions workflow needs a Cloudflare API token to deploy the worker.

### Step 1: Create the token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**
3. Select the **"Edit Cloudflare Workers"** template
4. Configure permissions (the template sets these automatically):
   - **Account** > **Worker Scripts** > **Edit**
   - **Zone** > **Workers Routes** > **Edit**
5. Under **Account Resources**, select your account
6. Under **Zone Resources**, select **"All zones"** (or specific zone if preferred)
7. Click **"Continue to summary"** > **"Create Token"**
8. **Copy the token** (it's shown only once)

### Step 2: Get your Account ID

1. Go to https://dash.cloudflare.com
2. Click any domain (or Workers & Pages)
3. Your **Account ID** is in the right sidebar, or in the URL: `dash.cloudflare.com/<account-id>/...`

### Step 3: Add secrets to GitHub

1. Go to your repo: https://github.com/a-tsygankov/tarot/settings/secrets/actions
2. Click **"New repository secret"**
3. Add two secrets:
   - Name: `CLOUDFLARE_API_TOKEN` / Value: the token from step 1
   - Name: `CLOUDFLARE_ACCOUNT_ID` / Value: your account ID from step 2

---

## In-App Debug Console

Triple-tap the **"Tarot"** logo in the bottom bar to toggle debug mode. This swaps the coffee link for a Console button that opens an in-app log viewer.

The console shows:
- Startup diagnostics (version, API health, TTS/STT status)
- User context (UID, session, language, device)
- Preferences (theme, deck, font, voice)
- API errors with full detail
- Boot timing

---

## Settings

Available in-app via the ⚙ button:

- **Language**: English, Russian, Ukrainian, German, Azerbaijani
- **Tone**: Mystical, Ironic, Serious, Gentle
- **Theme**: Dusk, Midnight, Parchment, Forest
- **Card Deck**: Classic (traditional tarot SVG art) or Cat Tarot (cat-themed, lazy-loaded)
- **Voice**: Female / Male / Off (ElevenLabs TTS)
- **Speed**: 0.75x / 1x / 1.5x / 2x
- **Reading Font**: Palatino, Garamond, Cinzel, Fraktur, Philosopher + italic toggle
- **Profile**: Name (helps personalize readings)

All preferences persist in localStorage.
