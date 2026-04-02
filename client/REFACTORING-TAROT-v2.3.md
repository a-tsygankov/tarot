# Tarot Oracle — Refactoring Plan v2.3

**Date:** April 1, 2026
**Status:** Planning only — no implementation yet
**Working repo for all refactoring:** `apps/tarot-dev` only
**Production repo:** `apps/Tarot` (deploy only after explicit approval)
**Current direction:** TypeScript + Vite + Lit (selective) + Cloudflare Workers + **R2-only persistence**

---

## Changelog

- **v2.3** — Verification pass. Restored all missing implementation-level detail from v1 and v2.1 that v2.2 omitted: CONFIG reference, UserContext/GameContext method behaviors, adaptive token budget, full prompt templates, prompt assembly, API payload examples, Worker source structure, ElevenLabs specifics, distillation walkthrough, event tracking list, localStorage keys, R2 entity document shapes, index examples, write-time data flows, concurrency strategy, deployment manifest, UI priorities, rate limiting, open questions. Cleaned up citation artifacts.
- **v2.2** — Consolidated comparison of v1 and v2.1. Restored engineering rules, DI, async progress, fallback/retry, tests, distillation flow, versioning, schema upgrade logic.
- **v2.1** — R2-only storage variant with object documents, materialized indexes, schema descriptors, rebuild jobs.
- **v1.x** — Original modular architecture, UserContext/GameContext, distillation, analytics dashboard, DI-based TTS/STT.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Non-Negotiable Engineering Rules](#2-non-negotiable-engineering-rules)
3. [Target Repository Rule](#3-target-repository-rule)
4. [Architecture Overview](#4-architecture-overview)
5. [Technology Decisions](#5-technology-decisions)
6. [GitHub Pages Deployment](#6-github-pages-deployment)
7. [Client Module Map](#7-client-module-map)
8. [Client Configuration Reference](#8-client-configuration-reference)
9. [Core Client Models: UserContext & GameContext](#9-core-client-models-usercontext--gamecontext)
10. [Server Module Map (Cloudflare Workers)](#10-server-module-map-cloudflare-workers)
11. [API Contracts with Payload Examples](#11-api-contracts-with-payload-examples)
12. [System Prompts & Context Distillation](#12-system-prompts--context-distillation)
13. [Adaptive Token Budget](#13-adaptive-token-budget)
14. [Speech Architecture and DI](#14-speech-architecture-and-di)
15. [ElevenLabs Integration (Free Plan)](#15-elevenlabs-integration-free-plan)
16. [R2-Only Persistence Model](#16-r2-only-persistence-model)
17. [R2 Entity Document Shapes](#17-r2-entity-document-shapes)
18. [Repository Pattern for R2](#18-repository-pattern-for-r2)
19. [R2 Indexes and Query Strategy](#19-r2-indexes-and-query-strategy)
20. [Write-Time Data Flows](#20-write-time-data-flows)
21. [Concurrency Strategy](#21-concurrency-strategy)
22. [Schema Versioning & Upgrade Logic](#22-schema-versioning--upgrade-logic)
23. [Component Versioning & Compatibility](#23-component-versioning--compatibility)
24. [Analytics, Events & Dashboard](#24-analytics-events--dashboard)
25. [Security Model](#25-security-model)
26. [UI Refactoring Priorities](#26-ui-refactoring-priorities)
27. [Settings & Client Persistence](#27-settings--client-persistence)
28. [Testing Strategy](#28-testing-strategy)
29. [Deployment Scripts](#29-deployment-scripts)
30. [Migration Phases](#30-migration-phases)
31. [Open Questions](#31-open-questions)

---

## 1. Executive Summary

v2.3 is the authoritative merged plan. It keeps the R2-only storage approach from v2.1 and restores all missing implementation-level detail from v1.

### Final decisions

1. All refactoring work stays in `apps/tarot-dev` until explicit approval
2. Client stack = TypeScript + Vite + Lit (selective)
3. Deployment = GitHub Pages via GitHub Actions
4. Storage = R2 only (no D1)
5. DI required where it improves flexibility and testing
6. Async operations expose progress
7. Fallback and retry are required
8. API documentation must be generated
9. Tests are required at every phase
10. Human-readable code, clean-code principles mandatory
11. UserContext / GameContext / 3-part distillation are core architecture
12. Versioning and compatibility between all components mandatory
13. Schema upgrade and activation switching mandatory with R2-only
14. ElevenLabs free tier is the starting operational assumption

---

## 2. Non-Negotiable Engineering Rules

### 2.1 Code readability and maintainability

- Follow **DRY**, **KISS**, **SOLID**
- Split long methods into logical parts (target max ~40 lines)
- Keep files focused on one responsibility
- Prefer explicit naming over clever compactness
- Avoid hidden side effects
- Document public contracts with TSDoc

### 2.2 Dependency Injection

Mandatory DI targets:

| Component | Interface | Implementations |
|-----------|-----------|-----------------|
| TTS (client) | `ITtsService` | `ElevenLabsTtsService`, `BrowserTtsService`, `FallbackTtsService` |
| STT (client) | `ISttService` | `BrowserSttService` |
| API (client) | `IApiService` | `ApiService` (+ mock for tests) |
| Storage (client) | `IStorageService` | `LocalStorageService` |
| Repository (worker) | `IRepository<T>` | `R2UserRepository`, `R2GameRepository`, etc. |
| AI routing (worker) | `IAiRouter` | Gemini -> Anthropic fallback chain |
| Notification (worker) | `INotificationService` | Owner notification implementation |

Wiring in entry points only (`composition-root.ts` for client, `index.ts` for workers).

### 2.3 Async with progress

Standard pattern:

```ts
export interface IProgressReporter {
    report(status: string, percent?: number): void;
}

export interface OperationOptions {
    progress?: IProgressReporter;
    cancellationToken?: AbortSignal;
}
```

Operations that must support progress:
- Reading request, follow-up request
- TTS generation/download
- Index rebuild, migration/export jobs
- Deployment verification, analytics snapshot rebuild

### 2.4 Fallback and retry

| Operation | Retry | Fallback |
|-----------|-------|----------|
| LLM reading/followup | 2 retries with backoff | Provider A -> Provider B |
| TTS request | 1-2 retries | ElevenLabs -> Browser `speechSynthesis` |
| Analytics/event write | Queue or defer | User flow continues |
| Dashboard snapshot | Retry read | Previous snapshot + stale indicator |
| R2 object read | Retry when safe | Error to caller |

### 2.5 Tests

Required at every phase. See [Section 28](#28-testing-strategy).

### 2.6 API documentation

- OpenAPI spec for Worker endpoints
- Markdown docs checked into repo
- Static API docs page in `apps/tarot-dev/docs/` or dashboard admin area
- Updated with CI checks when contracts change

---

## 3. Target Repository Rule

All refactoring work stays in:

```text
apps/tarot-dev
```

That includes: client, dashboard, docs, tests, deployment workflows, migration scripts.

Production repo `apps/Tarot` remains deployment-only until explicitly approved.

---

## 4. Architecture Overview

```text
┌────────────────────────────────────────────────────────────────────┐
│ CLIENT APP (GitHub Pages — apps/tarot-dev)                        │
│ TypeScript + Vite + Lit (selective)                               │
│                                                                    │
│ - Tarot UI (cards, reading, follow-up)                            │
│ - Settings panel                                                   │
│ - STT/TTS orchestration                                           │
│ - Analytics dashboard UI                                           │
│ - Version compatibility check on load                             │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ HTTPS / JSON
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│ EDGE SERVICES (Cloudflare Workers)                                │
│                                                                    │
│ tarot-api Worker                                                   │
│   POST /api/reading        — AI reading + distillation            │
│   POST /api/followup       — Q&A with context                     │
│   POST /api/tts            — ElevenLabs proxy + cache             │
│   POST /api/session        — log session start                    │
│   POST /api/event          — log user events                      │
│   GET  /api/meta/version   — compatibility check                  │
│   GET  /api/docs           — OpenAPI spec                         │
│                                                                    │
│ tarot-admin Worker                                                 │
│   migration orchestration, index rebuild, health checks,           │
│   owner notifications, incident intake                             │
│                                                                    │
│ analytics Worker                                                   │
│   dashboard queries (reads precomputed R2 snapshots)               │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ R2 bindings
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│ R2 OBJECT STORAGE (single persistence layer)                       │
│                                                                    │
│ /manifests/    /schemas/     /entities/    /indexes/               │
│ /analytics/    /incidents/   /audio-cache/ /exports/               │
└────────────────────────────────────────────────────────────────────┘
```

---

## 5. Technology Decisions

### 5.1 Client

| Choice | Rationale |
|--------|-----------|
| **TypeScript** | Type safety, self-documenting interfaces, shared types with workers |
| **Vite** | Fast dev server, HMR, tree-shaking, simple config |
| **Lit** (selective) | Lightweight web components for interactive pieces (cards, panels, settings). Static sections stay vanilla TS + DOM. |
| **GitHub Pages** | Free hosting, separate dev and production repos |

### 5.2 Server

- Cloudflare Workers (TypeScript)
- Modular handlers/services/repositories
- Prompt assembly and provider routing server-side only
- No AI/TTS keys on client

### 5.3 Persistence

- **R2 only** — no D1
- All query patterns adapted to object-storage constraints
- See [Section 16](#16-r2-only-persistence-model) for trade-offs

### 5.4 Shared package

`shared/` contains types used by both client and workers:
- Entity interfaces, API request/response contracts
- Validation utilities, version constants

---

## 6. GitHub Pages Deployment

GitHub Actions custom workflows.

### Workflow responsibilities
- Install dependencies
- Run type-checks
- Run tests
- Build client via Vite
- Publish Pages artifact
- Record manifest/version metadata

### Base path

```ts
base: '/apps/tarot-dev/'
```

Production deployment only after explicit approval.

---

## 7. Client Module Map

```text
apps/tarot-dev/
  src/
    main.ts                           — entry point
    app/
      composition-root.ts             — DI wiring
      config.ts                       — all configurable values
      feature-flags.ts
      version.ts

    models/
      UserContext.ts                   — accumulated user profile
      GameContext.ts                   — per-reading session state
      contracts.ts                    — shared type definitions

    services/
      ApiService.ts                   — Worker communication, retry, progress
      Tts/
        ITtsService.ts
        ElevenLabsTtsService.ts       — via Worker proxy
        BrowserTtsService.ts          — speechSynthesis fallback
        FallbackTtsService.ts         — tries primary, falls back
      Stt/
        ISttService.ts
        BrowserSttService.ts          — Web Speech API
      Audio/
        AudioService.ts               — card-flip sounds, theme audio
      Storage/
        LocalStorageService.ts        — localStorage wrapper
      Versioning/
        CompatibilityService.ts       — checks /api/meta/version

    ui/
      components/                     — Lit web components
      panels/                         — ReadingPanel, SettingsPanel
      layout/                         — BottomBar, AudioBar
      icons/                          — OrbMic, MoonSpeaker, StarwheelSettings
      view-models/

    deck.ts                           — 78-card Major + Minor Arcana + SVG
    icons.ts                          — SVG icon functions

  dashboard/                          — analytics UI (separate entry point)
  public/                             — static assets, manifest, icons
  tests/                              — Vitest test files
```

---

## 8. Client Configuration Reference

```ts
export const CONFIG = {
  apiBase: 'https://tarot-api.YOUR.workers.dev',

  languages: [
    { code: 'ENG', label: 'English',     sttLang: 'en-US', voiceId: 'ELEVEN_EN_VOICE_ID' },
    { code: 'RUS', label: 'Русский',     sttLang: 'ru-RU', voiceId: 'ELEVEN_RU_VOICE_ID' },
    { code: 'UKR', label: 'Українська',  sttLang: 'uk-UA', voiceId: null },
    { code: 'DEU', label: 'Deutsch',     sttLang: 'de-DE', voiceId: null },
    { code: 'AZE', label: 'Azərbaycan',  sttLang: 'az-AZ', voiceId: null },
  ],

  tones: ['Mystical', 'Ironic', 'Serious', 'Gentle'],

  themes: [
    { id: 'dusk',      label: 'Dusk' },
    { id: 'midnight',  label: 'Midnight' },
    { id: 'parchment', label: 'Parchment' },
    { id: 'forest',    label: 'Forest' },
  ],

  topics: ['Love', 'Career', 'Health', 'Spirit', 'Finance', 'Change'],

  tts: {
    provider: 'elevenlabs' as const,
    defaultModel: 'eleven_flash_v2_5',
    defaultSpeed: 1.0,
    fallbackToBrowser: true,
  },

  stt: {
    provider: 'browser' as const,
  },

  retryCount: 2,
  readingTimeoutMs: 30_000,
  langDebounceSec: 4,
  maxQaHistoryInPrompt: 5,
  maxFollowUpsPerGame: 10,

  rateLimit: {
    readingsPerHour: 20,
    eventsPerMinute: 100,
  },

  version: '2.3.0',
  apiVersion: '2.0',
  debugTripleTapMs: 2000,
} as const;
```

---

## 9. Core Client Models: UserContext & GameContext

### 9.1 UserContext

Accumulated user profile built from AI-extracted data across sessions.

```ts
export interface IUserContext {
    uid: string;
    sessionId: string;
    name: string | null;
    gender: string | null;
    birthdate: string | null;
    location: string | null;
    traits: Record<string, string>;
    language: string;
    tone: string;
    theme: string;
    voiceId: string | null;
    totalReadings: number;
    deviceInfo: {
        userAgent: string;
        platform: string;
        screenWidth: number;
        screenHeight: number;
        timezone?: string;
    };
}
```

#### Method behaviors

| Method | Behavior |
|--------|----------|
| `restore()` | Reads all fields from localStorage (including `JSON.parse(traits)`) |
| `save()` | Persists all saveable fields to localStorage (including `JSON.stringify(traits)`) |
| `applyAiUpdate(delta)` | Merges AI-returned delta. **Known fields** (`name`, `gender`, `birthdate`, `location`) go to top-level properties. **Everything else** in `delta.traits` merges into `this.traits`. **Null values are ignored** (never delete existing). Then calls `save()`. |
| `toApiPayload()` | Returns `{ uid, sessionId, name, gender, birthdate, location, traits, language, tone }` |
| `toPromptSummary()` | Builds human-readable string: `"Name: Anna \| Gender: female \| zodiac sign: Scorpio \| relationship status: complicated"`. Returns `"No personal details known."` if empty. |

#### Traits examples

```ts
traits: {
    zodiac_sign: "Scorpio",
    relationship_status: "complicated",
    partner_name: "Alex",
    occupation: "engineer",
    fears: "commitment",
    children: "2"
}
```

AI extracts these automatically. Keys are snake_case. Only facts the seeker explicitly stated — never inferred.

### 9.2 GameContext

Per-spread session state. One game = one card reading + 0..N follow-up turns.

```ts
export interface IGameContext {
    gameId: string;
    spreadType: 1 | 3 | 5;
    cards: Array<{
        id?: string;
        name: string;
        position: string;
        reversed: boolean;
        keywords?: string[];
    }>;
    question: string | null;
    topic: string | null;
    reading: ReadingPayload | null;
    readingDigest: string | null;
    qaHistory: Array<{
        role: 'user' | 'oracle';
        digest: string;
        ts: number;
    }>;
    readingLang: string | null;
    readingTone: string | null;
    turnCount: number;
}
```

#### Method behaviors

| Method | Behavior |
|--------|----------|
| `addCard(card)` | Pushes card to `this.cards` |
| `isComplete()` | Returns `this.cards.length >= this.spreadType` |
| `applyReading(aiResponse)` | Sets `this.reading = aiResponse.reading` (full — for UI) and `this.readingDigest = aiResponse.contextUpdate` (for future prompts) |
| `addQA(questionDigest, answerDigest)` | Pushes two entries to `qaHistory` (user + oracle, digest only). Increments `turnCount`. Full text is NOT stored here. |
| `isLongConversation()` | Returns `this.turnCount >= 3` |
| `toPromptContext()` | Builds context string: `GAME: 3-card spread.\nCARDS: Past: The Fool, Present: Death (Rev)...\nREADING SUMMARY: ...\nCONVERSATION HISTORY (digests):\n  USER: ...\n  ORACLE: ...` |
| `toApiPayload()` | Returns `{ gameId, spreadType, cards, question, topic, readingDigest, qaDigests, turnCount }` |
| `reset(spreadType)` | Clears all fields, generates new `gameId` |

#### Why digest-only qaHistory

Full oracle answers are too large for prompt context across many turns. Instead:
- Full text renders in UI directly and logs to R2 (turn documents)
- Only short digests (~30 words each) stay in `qaHistory` for prompt context
- This keeps the context window lean even across 10+ follow-ups

---

## 10. Server Module Map (Cloudflare Workers)

### 10.1 tarot-api Worker

```text
workers/tarot-api/
  src/
    index.ts                    — router: maps paths to handlers
    config.ts                   — model lists, defaults, prompt template refs
    prompts.ts                  — all system prompt templates
    handlers/
      reading.ts                — POST /api/reading
      followup.ts               — POST /api/followup
      tts.ts                    — POST /api/tts
      session.ts                — POST /api/session
      event.ts                  — POST /api/event
      version.ts                — GET /api/meta/version
    services/
      gemini.ts                 — Gemini API caller (retry, model fallback)
      anthropic.ts              — Anthropic API caller
      elevenlabs.ts             — ElevenLabs TTS API caller
      ai-router.ts              — tries Gemini → Anthropic, returns first success
    repositories/
      user-repository.ts
      game-repository.ts
      analytics-repository.ts
      version-repository.ts
      incident-repository.ts
    indexes/
      index-writer.ts           — updates materialized indexes after writes
    infrastructure/
      r2-adapter.ts             — low-level R2 operations
  wrangler.toml
  openapi.yaml                  — generated API spec
```

### 10.2 tarot-admin Worker

```text
workers/tarot-admin/src/
  handlers/
    migration.ts
    health-check.ts
    notification.ts
  maintenance/
    rebuild-indexes.ts
    repair-jobs.ts
```

### 10.3 analytics Worker

```text
workers/analytics/src/
  handlers/
    dashboard.ts              — reads precomputed R2 snapshots
    export.ts                 — full data export
```

### 10.4 Shared package

```text
shared/
  contracts/
    api-contracts.ts          — request/response types for all endpoints
    entity-contracts.ts       — UserDocument, GameDocument, TurnDocument, etc.
  models/
    user-context.ts           — IUserContext interface
    game-context.ts           — IGameContext interface
  utils/
    validation.ts
    date-utils.ts
  constants/
    versions.ts               — version constants
```

---

## 11. API Contracts with Payload Examples

### 11.1 `POST /api/reading`

**Request:**
```json
{
  "userContext": {
    "uid": "abc-123",
    "sessionId": "sess-456",
    "name": "Anna",
    "gender": "female",
    "language": "RUS",
    "tone": "Ironic",
    "location": "Boston, US",
    "traits": { "zodiac_sign": "Scorpio" }
  },
  "gameContext": {
    "gameId": "game-789",
    "spreadType": 3,
    "cards": [
      { "name": "The Fool", "position": "Past", "reversed": false, "keywords": ["New beginnings", "Spontaneity"] },
      { "name": "Death", "position": "Present", "reversed": true, "keywords": ["Transformation", "Change"] },
      { "name": "Ace of Cups", "position": "Future", "reversed": false, "keywords": ["Love", "New feelings"] }
    ],
    "question": "Will my relationship work out?",
    "topic": "Love",
    "readingDigest": null,
    "qaDigests": []
  }
}
```

**Response (3-part distillation):**
```json
{
  "reading": {
    "cards": [
      { "position": "Прошлое", "name": "Шут", "reading": "..." },
      { "position": "Настоящее", "name": "Смерть (перевёрнутая)", "reading": "..." },
      { "position": "Будущее", "name": "Туз Кубков", "reading": "..." }
    ],
    "overall": "..."
  },
  "contextUpdate": "Seeker asked about romantic relationship. Cards suggest past innocence, current resistance to change, future emotional opening. Key theme: letting go enables love.",
  "userContextDelta": {
    "name": null,
    "gender": null,
    "birthdate": null,
    "location": null,
    "traits": {
      "relationship_status": "in a complicated relationship"
    }
  },
  "provider": "gemini",
  "model": "gemini-2.5-flash"
}
```

### 11.2 `POST /api/followup`

**Request:**
```json
{
  "userContext": { "...same shape as above..." },
  "gameContext": {
    "...same shape, now with readingDigest and qaDigests populated..."
  },
  "question": "What should I do about the Death card being reversed?"
}
```

**Response:**
```json
{
  "answer": "The reversed Death card in your present position...",
  "questionDigest": "Asked about reversed Death card meaning in relationship context",
  "answerDigest": "Explained that reversed Death = resistance to necessary change. Advised embracing transformation.",
  "userContextDelta": null
}
```

### 11.3 `POST /api/tts`

**Request:**
```json
{
  "text": "Шут говорит о новых начинаниях...",
  "language": "RUS",
  "voiceId": "ELEVEN_RU_VOICE_ID",
  "model": "eleven_flash_v2_5",
  "speed": 1.0
}
```

**Response:** `Content-Type: audio/mpeg` — raw mp3 bytes.
On quota exceeded: `429` with `{ "fallback": true, "reason": "monthly_limit" }`.

### 11.4 `POST /api/session`

| Field | Type | Required |
|-------|------|----------|
| `uid` | string | yes |
| `sessionId` | string | yes |
| `appVersion` | string | yes |
| `apiVersion` | string | yes |
| `screenWidth` | number | no |
| `screenHeight` | number | no |
| `device` | string | no |

### 11.5 `POST /api/event`

| Field | Type | Required |
|-------|------|----------|
| `uid` | string | yes |
| `sessionId` | string | yes |
| `eventType` | string | yes |
| `eventData` | object | no |

### 11.6 `GET /api/meta/version`

**Response:**
```json
{
  "app": { "latest": "2.3.0", "minimumSupported": "2.0.0" },
  "api": { "current": "2.0", "supported": ["2.0"] },
  "worker": { "version": "2.3.0" },
  "schema": { "current": "2026.04.15-01" },
  "manifest": { "id": "20260401-001" },
  "compatibility": { "status": "ok" },
  "maintenanceMode": false
}
```

---

## 12. System Prompts & Context Distillation

### 12.1 Prompt templates

All prompts live in `workers/tarot-api/src/prompts.ts`. No prompt text hardcoded in handlers.

```ts
export const PROMPTS = {
  systemReading: `You are a wise, poetic Tarot oracle...`,

  distillationInstruction: `
IMPORTANT: Return your response as JSON with exactly these fields:
{
  "reading": { "cards": [...], "overall": "..." },
  "contextUpdate": "1-2 sentence distilled summary of this reading for future reference",
  "userContextDelta": {
    "name": <string|null if user mentioned their name>,
    "gender": <string|null if user mentioned their gender>,
    "birthdate": <string|null>,
    "location": <string|null>,
    "traits": {
      <key>: <value> for ANY personal detail the seeker revealed.
      Extract things like: zodiac_sign, relationship_status, partner_name,
      sexuality, occupation, interests, fears, goals, children, pets,
      health_conditions, spiritual_beliefs, age, nationality,
      or ANY other personal fact. Use snake_case keys. Only include facts
      the seeker explicitly stated — never infer or assume.
      Return empty object {} if no new personal details were shared.
    }
  }
}
The contextUpdate should capture: key themes, emotional tone, specific advice given.
The userContextDelta should ONLY contain fields the seeker explicitly mentioned.`,

  systemFollowUp: `You are continuing a Tarot reading conversation...`,

  followUpDistillation: `
Return your response as JSON:
{
  "answer": "your oracle response text",
  "questionDigest": "1 sentence summary of what the seeker asked",
  "answerDigest": "1 sentence summary of your answer — capture the key insight",
  "userContextDelta": {
    "name": null, "gender": null, "birthdate": null, "location": null,
    "traits": {}
  }
}
CRITICAL: questionDigest and answerDigest must be SHORT (max 30 words each).
They are compressed memory for future turns, not displayed to the user.`,

  tones: {
    Mystical: '',
    Ironic: 'TONE: Be witty, ironic, use dark humor freely...',
    Serious: 'TONE: Be direct, analytical, no embellishment...',
    Gentle: 'TONE: Be warm, nurturing, reassuring...',
  },

  languages: {
    ENG: 'Write your entire response in English.',
    RUS: 'Write your entire response in Russian (Русский).',
    UKR: 'Write your entire response in Ukrainian (Українська).',
    DEU: 'Write your entire response in German (Deutsch).',
    AZE: 'Write your entire response in Azerbaijani (Azərbaycan dili).',
  },
};
```

### 12.2 Prompt assembly (in Worker)

```text
[systemReading]
[tone modifier]
[language instruction]

USER CONTEXT:
Name: Anna | Gender: female | zodiac sign: Scorpio | relationship status: complicated

GAME CONTEXT:
[gameContext.toPromptContext()]

SEEKER'S QUESTION: "Will my relationship work out?"

[distillationInstruction]
```

### 12.3 Distillation walkthrough

```text
INITIAL READING:
  User draws 3 cards + asks "Will my love life improve?"
  → Worker builds prompt with cards + question + user context
  → AI returns 3 parts: { reading, contextUpdate, userContextDelta }
  → Client stores reading (full text — for UI display)
  → Client stores contextUpdate as readingDigest (for future prompts)
  → If userContextDelta.traits has entries → merge into UserContext.traits

FOLLOW-UP #1:
  User asks: "What about the Death card?"
  → Client sends request with:
      - UserContext (traits: { relationship_status: "complicated" })
      - GameContext.toPromptContext():
          CARDS: Past: The Fool, Present: Death (Rev), Future: Ace of Cups
          READING SUMMARY: "Seeker asked about love. Cards suggest..."
          CONVERSATION HISTORY: (empty — no prior QA digests)
  → AI returns: { answer, questionDigest, answerDigest, userContextDelta }
  → Client displays full answer in UI (NOT stored in qaHistory)
  → Client stores ONLY digests: gameContext.addQA(questionDigest, answerDigest)
  → Full answer logged to R2 as turn document

FOLLOW-UP #2:
  User says: "My name is Anna, I'm a Scorpio. Should I talk to him?"
  → GameContext.toPromptContext() now includes:
      CONVERSATION HISTORY (digests):
        USER: Asked about reversed Death card meaning
        ORACLE: Explained resistance to change, advised embracing it
  → AI returns userContextDelta: {
      name: "Anna", gender: "female",
      traits: { zodiac_sign: "Scorpio", partner_gender: "male" }
    }
  → UserContext.applyAiUpdate(delta):
      name="Anna", gender="female",
      traits={ relationship_status:"complicated", zodiac_sign:"Scorpio", partner_gender:"male" }
  → Persists to localStorage, carries forward to all future sessions

FOLLOW-UP #5 (long conversation — adaptive budget kicks in):
  → turnCount=5, isLongConversation()=true
  → Worker uses larger token budget
  → All 5 QA digests fit comfortably (~150 tokens total)
  → AI has full conversation arc for deeply contextual answers
```

---

## 13. Adaptive Token Budget

Token limits scale with conversation depth:

| State | Context Budget | Max Response | Total |
|-------|---------------|-------------|-------|
| Initial reading (0 turns) | ~500 tokens | 3,500 | 4,000 |
| Short (1-2 turns) | ~700 tokens | 3,500 | 4,200 |
| Long (3-5 turns) | ~1,000 tokens | 4,500 | 5,500 |
| Deep (6+ turns) | ~1,200 tokens | 5,500 | 6,700 |

**Why:** Long conversations are more valuable — the user is engaged. Cutting context here degrades the experience at exactly the wrong moment.

### Budget function

```ts
function getTokenBudget(turnCount: number) {
    if (turnCount === 0) return { contextMax: 500, responseMax: 3500 };
    if (turnCount <= 2) return { contextMax: 700, responseMax: 3500 };
    if (turnCount <= 5) return { contextMax: 1000, responseMax: 4500 };
    return { contextMax: 1200, responseMax: 5500 };
}
```

### Trimming strategy

If QA digests exceed the context budget:
1. Keep reading digest always (~50 tokens)
2. Keep most recent 3 QA exchanges always
3. Summarize older exchanges into a single "Earlier in the conversation: ..." line

### Model selection

- 0-2 turns: `gemini-2.5-flash` (fast, cheap)
- 3+ turns: `gemini-2.5-flash` with increased `maxOutputTokens`
- On failure: fall back to `gemini-2.5-pro` or Anthropic

Every request logs `turnCount` and actual token budget for dashboard monitoring.

---

## 14. Speech Architecture and DI

### 14.1 TTS interface

```ts
export interface ITtsService {
    isAvailable(): boolean;
    speakAsync(text: string, lang: string, options?: SpeakOptions, progress?: IProgressReporter): Promise<void>;
    stop(): void;
    pause(): void;
    resume(): void;
}

export interface SpeakOptions {
    voiceId?: string;
    speed?: number;
    onStart?: () => void;
    onEnd?: () => void;
}
```

### 14.2 STT interface

```ts
export interface ISttService {
    isAvailable(): boolean;
    startAsync(lang: string, handlers: SttHandlers): Promise<void>;
    stop(): void;
}

export interface SttHandlers {
    onResult?: (transcript: string) => void;
    onInterim?: (transcript: string) => void;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: string) => void;
}
```

### 14.3 Implementations

| Class | Behavior |
|-------|----------|
| `ElevenLabsTtsService` | Sends text to Worker → Worker calls ElevenLabs → returns mp3 blob → plays via Audio API |
| `BrowserTtsService` | Uses `speechSynthesis` API (free, lower quality) |
| `FallbackTtsService` | Tries primary (ElevenLabs), catches failure, falls back to secondary (browser) |
| `BrowserSttService` | Uses Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) |

### 14.4 DI wiring in composition root

```ts
const apiService = new ApiService(CONFIG, userContext);
const sttService = new BrowserSttService();

const elevenTts = new ElevenLabsTtsService(apiService, CONFIG);
const browserTts = new BrowserTtsService();
const ttsService = CONFIG.tts.fallbackToBrowser
    ? new FallbackTtsService(elevenTts, browserTts)
    : elevenTts;

// Inject into UI
const readingPanel = new ReadingPanel({ ttsService, apiService });
const questionInput = new QuestionInput({ sttService });
```

---

## 15. ElevenLabs Integration (Free Plan)

### 15.1 Free tier constraints

| Limit | Value |
|-------|-------|
| Characters/month | 10,000 |
| Estimated readings covered | ~6 full readings |
| Custom voices | 1 |
| Models | `eleven_flash_v2_5` (fast, ~75ms), `eleven_multilingual_v2` (higher quality) |
| Russian support | Full native |
| Ukrainian support | Supported in Flash v2.5 and Multilingual v2 |
| Azerbaijani support | Supported in Flash v2.5 (listed as `aze`) |

### 15.2 Design constraints from free tier

- Browser TTS fallback must exist and work
- App must handle quota exhaustion gracefully (no crash, no broken UI)
- TTS is optional — core reading flow never depends on it
- Audio caching in R2 (`audio-cache/tts/{hash}.mp3`) reduces repeated generation
- Monthly character usage tracked in R2: `analytics/tts/monthly-chars.json`
- When budget exhausted, Worker returns 429 → client auto-falls back to browser TTS
- Dashboard shows TTS errors and quota status

### 15.3 Worker TTS handler sketch

```ts
export async function handleTTS(request: Request, env: Env): Promise<Response> {
    const { text, language, voiceId, model, speed } = await request.json();

    // Check R2 cache first
    const hash = await hashText(text + language + (voiceId || ''));
    const cached = await env.R2.get(`audio-cache/tts/${hash}.mp3`);
    if (cached) return new Response(cached.body, { headers: { 'Content-Type': 'audio/mpeg' } });

    // Budget check
    const usage = await getMonthlyTTSUsage(env.R2);
    if (usage + text.length > env.TTS_MONTHLY_LIMIT) {
        return Response.json({ fallback: true, reason: 'monthly_limit' }, { status: 429 });
    }

    const voice = voiceId || env.DEFAULT_VOICE_ID;
    const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
        method: 'POST',
        headers: { 'xi-api-key': env.ELEVENLABS_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text,
            model_id: model || 'eleven_flash_v2_5',
            voice_settings: { stability: 0.6, similarity_boost: 0.8, speed: speed || 1.0 },
        }),
    });

    if (!resp.ok) throw new Error('ElevenLabs: ' + resp.status);

    await incrementTTSUsage(env.R2, text.length);
    await env.R2.put(`audio-cache/tts/${hash}.mp3`, resp.clone().body);

    return new Response(resp.body, { headers: { 'Content-Type': 'audio/mpeg' } });
}
```

### 15.4 Voice selection

| Language | Voice Style | Notes |
|----------|-------------|-------|
| English | Female, mature, mystical | Warm, wise tone |
| Russian | Female, mature, mystical | Same archetype |

**Action item:** Browse ElevenLabs voice library filtered by language + age before implementation.

---

## 16. R2-Only Persistence Model

### 16.1 Core principle

R2 is the single persistence layer. No SQL. JSON documents, not relational tables.

### 16.2 Object layout

```text
r2://tarot/
  manifests/
    20260401-001.json

  schemas/
    active.json
    versions/2026.04.01-01.json
    versions/2026.04.15-01.json

  entities/
    users/{uid}.json
    sessions/{sessionId}.json
    games/{gameId}.json
    turns/{gameId}/{turnNumber}.json
    incidents/{incidentId}.json

  indexes/
    users/by-last-seen/{bucket}.json
    users/by-name/{letter}.json
    games/by-user/{uid}.json
    games/by-date/{yyyy}/{mm}/{dd}.json
    sessions/by-user/{uid}.json
    events/by-type/{eventType}/{yyyy}/{mm}/{dd}.json
    incidents/by-severity/{severity}/{yyyy}/{mm}/{dd}.json

  analytics/
    daily/{date}-summary.json
    dashboard/overview.json
    dashboard/version-health.json
    dashboard/top-languages.json
    tts/monthly-chars.json

  incidents/
    evidence/{incidentId}.json

  audio-cache/
    tts/{hash}.mp3

  exports/
    full/{timestamp}.jsonl.gz
    migrations/{schemaVersion}-report.json
```

### 16.3 Persistence rules

- Canonical entities stored as JSON
- Append-heavy flows preferred (turns, events)
- Query paths use direct-key lookup or materialized indexes
- No "scan everything on live request" logic
- Analytics snapshots are precomputed
- Object keys generated server-side only, never from raw user text

### 16.4 Trade-offs

| Pros | Cons |
|------|------|
| Single persistence product | Not a true database — no SQL queries |
| Natural fit for exports, logs, audio cache | All indexes are application-managed |
| No relational migration tooling | Analytics require precomputed snapshots |
| Easy immutable snapshots and backups | Multi-object updates are non-atomic |
| Simpler operational story | Ad hoc querying is weak |

If the product later needs richer querying or live analytics, add D1 or another queryable store.

---

## 17. R2 Entity Document Shapes

### 17.1 User document (`entities/users/{uid}.json`)

```json
{
  "type": "user",
  "schemaVersion": "2026.04.15-01",
  "uid": "user_123",
  "firstSeenAt": "2026-04-01T15:00:00Z",
  "lastSeenAt": "2026-04-01T16:05:00Z",
  "name": "Anna",
  "gender": "female",
  "birthdate": null,
  "traits": {
    "zodiac_sign": "Scorpio",
    "relationship_status": "complicated"
  },
  "stats": {
    "totalReadings": 12,
    "totalFollowUps": 18
  },
  "preferences": {
    "language": "RUS",
    "tone": "Ironic"
  },
  "locations": {
    "lastCountry": "US",
    "lastCity": "Boston"
  },
  "etagVersion": 14
}
```

### 17.2 Game document (`entities/games/{gameId}.json`)

```json
{
  "type": "game",
  "schemaVersion": "2026.04.15-01",
  "gameId": "game_456",
  "uid": "user_123",
  "sessionId": "sess_789",
  "createdAt": "2026-04-01T15:10:00Z",
  "spreadType": 3,
  "cards": [
    { "position": "Past", "name": "The Fool", "reversed": false },
    { "position": "Present", "name": "Death", "reversed": true },
    { "position": "Future", "name": "Ace of Cups", "reversed": false }
  ],
  "question": "Will my relationship work out?",
  "topic": "Love",
  "language": "RUS",
  "tone": "Ironic",
  "reading": {},
  "readingDigest": "Short summary of the reading for prompt context",
  "turnCount": 3
}
```

### 17.3 Turn document (`entities/turns/{gameId}/{turnNumber}.json`)

```json
{
  "type": "turn",
  "schemaVersion": "2026.04.15-01",
  "gameId": "game_456",
  "uid": "user_123",
  "turnNumber": 1,
  "createdAt": "2026-04-01T15:15:00Z",
  "turnType": "followup",
  "question": "What about the Death card?",
  "questionDigest": "Asked about reversed Death card meaning",
  "answerText": "The reversed Death card in your present position...",
  "answerDigest": "Explained resistance to change, advised embracing it",
  "userContextDelta": null,
  "aiProvider": "gemini",
  "aiModel": "gemini-2.5-flash",
  "responseTimeMs": 2340,
  "tokenBudgetUsed": 4200,
  "success": true,
  "errorMessage": null
}
```

### 17.4 Session document (`entities/sessions/{sessionId}.json`)

```json
{
  "type": "session",
  "schemaVersion": "2026.04.15-01",
  "sessionId": "sess_789",
  "uid": "user_123",
  "createdAt": "2026-04-01T15:00:00Z",
  "country": "US",
  "city": "Boston",
  "timezone": "America/New_York",
  "device": "mobile",
  "userAgent": "...",
  "appVersion": "2.3.0",
  "screenWidth": 390,
  "screenHeight": 844
}
```

### 17.5 Security incident document (`entities/incidents/{incidentId}.json`)

```json
{
  "type": "incident",
  "schemaVersion": "2026.04.15-01",
  "incidentId": "inc_001",
  "createdAt": "2026-04-01T15:30:00Z",
  "severity": "medium",
  "incidentType": "prompt_injection_attempt",
  "uid": "user_123",
  "summary": "Suspicious payload detected in follow-up question",
  "evidenceKey": "incidents/evidence/inc_001.json"
}
```

---

## 18. Repository Pattern for R2

### 18.1 Why keep repositories even without SQL

- Hides R2 key layout from handlers
- Hides index maintenance logic
- Keeps handlers clean
- Centralizes validation and concurrency logic
- Enables testing with mocked R2
- Allows future backend replacement

### 18.2 Base contract

```ts
export interface IRepository<T, TId> {
    getByIdAsync(id: TId): Promise<T | null>;
    addAsync(entity: T): Promise<void>;
    updateAsync(entity: T): Promise<void>;
    deleteAsync(id: TId): Promise<void>;
}
```

### 18.3 Specialized repositories

```ts
export interface IUserRepository extends IRepository<UserDocument, string> {
    getProfileAsync(uid: string): Promise<UserDocument | null>;
    touchLastSeenAsync(uid: string, atUtc: string): Promise<void>;
}

export interface IGameRepository extends IRepository<GameDocument, string> {
    getGamesByUserAsync(uid: string): Promise<GameDocument[]>;
    addTurnAsync(turn: TurnDocument): Promise<void>;
}

export interface IAnalyticsRepository {
    getDailySummaryAsync(date: string): Promise<DailySummary | null>;
    updateDailySummaryAsync(delta: DailySummaryDelta): Promise<void>;
    getMonthlyTTSUsageAsync(): Promise<number>;
    incrementTTSUsageAsync(chars: number): Promise<void>;
}

export interface IVersionRepository {
    getActiveSchemaAsync(): Promise<ActiveSchemaDocument>;
    activateSchemaAsync(version: string): Promise<void>;
}

export interface ISecurityIncidentRepository {
    addAsync(incident: SecurityIncidentDocument): Promise<void>;
}
```

### 18.4 Call chain

```text
Handler → Service → Repository → R2 adapter
```

Handlers never manipulate bucket keys directly.

---

## 19. R2 Indexes and Query Strategy

### 19.1 Query rules

Every API/dashboard query must use:
1. Direct object key lookup, or
2. Precomputed index object, or
3. Precomputed analytics snapshot

**Never** scan all objects on live requests (except rare admin jobs).

### 19.2 Index examples

**Games by user** (`indexes/games/by-user/user_123.json`):
```json
{
  "uid": "user_123",
  "updatedAt": "2026-04-01T16:10:00Z",
  "gameIds": ["game_456", "game_457", "game_458"]
}
```

**Daily summary** (`analytics/daily/2026-04-01-summary.json`):
```json
{
  "date": "2026-04-01",
  "sessions": 340,
  "uniqueUsers": 218,
  "readings": 511,
  "followUps": 1229,
  "topLanguages": [
    { "language": "RUS", "count": 200 },
    { "language": "ENG", "count": 180 }
  ]
}
```

### 19.3 Pagination

Index-driven:
- Store pages or buckets in index files
- Use cursors encoded from index keys
- No "OFFSET N" style behavior

---

## 20. Write-Time Data Flows

### 20.1 Session start (app load)

1. Write `entities/sessions/{sessionId}.json`
2. Upsert `entities/users/{uid}.json` (create if new, update `lastSeenAt`)
3. Update indexes: `users/by-last-seen`, `sessions/by-user/{uid}`
4. Update daily summary

### 20.2 New reading

1. Write `entities/games/{gameId}.json`
2. Write `entities/turns/{gameId}/0.json` (initial reading turn)
3. Update `indexes/games/by-user/{uid}.json`
4. Update `indexes/games/by-date/{yyyy}/{mm}/{dd}.json`
5. Update daily analytics summary
6. Increment user stats (`totalReadings`)

### 20.3 Follow-up turn

1. Write `entities/turns/{gameId}/{turnNumber}.json`
2. Patch game document `turnCount`
3. Patch user stats (`totalFollowUps`)
4. Update daily analytics summary

### 20.4 Security incident

1. Write `incidents/evidence/{incidentId}.json` (raw evidence)
2. Write `entities/incidents/{incidentId}.json` (structured summary)
3. Update `indexes/incidents/by-severity/{severity}/{date}.json`
4. Update `analytics/dashboard/security-summary.json`
5. Trigger owner notification

---

## 21. Concurrency Strategy

R2 is object storage without transactional guarantees. Strategies:

| Pattern | When to use |
|---------|-------------|
| **Append-only immutable objects** | Turns, events, incidents — no contention |
| **Optimistic concurrency via `etagVersion`** | User documents, game documents — read → increment → write, retry on conflict |
| **Single-writer discipline** | Analytics snapshots, indexes — only one writer at a time per object family |
| **Asynchronous compaction/materialization** | Rebuild indexes from entity snapshots as a batch job |

For this app:
- Append events/turns as immutable objects
- Store user/game snapshots with `etagVersion` field
- Rebuild indexes after writes
- Use admin repair jobs for recovery

---

## 22. Schema Versioning & Upgrade Logic

### 22.1 Why it still matters with R2

Even without SQL, object contracts and index contracts evolve. Schema generation and activation still matter.

### 22.2 Schema generation format

Immutable: `YYYY.MM.DD-NN`

Examples: `2026.04.01-01`, `2026.04.15-01`

### 22.3 Active schema marker (`schemas/active.json`)

```json
{
  "schemaVersion": "2026.04.15-01",
  "compatibilityApiMin": "2.0",
  "compatibilityApiMax": "2.x",
  "activatedAt": "2026-04-15T10:30:00Z",
  "sourceSchemaVersion": "2026.04.01-01",
  "status": "active"
}
```

### 22.4 Schema descriptor (`schemas/versions/{version}.json`)

Contains:
- Entity contract versions and required fields
- Index definitions
- Migration steps from previous version
- Compatibility matrix
- Validation report key

### 22.5 Upgrade workflow

1. Export current objects/indexes to `exports/`
2. Create new schema descriptor
3. Transform entity documents to new JSON shape
4. Write migrated entities (replace-in-place under guard)
5. Rebuild all indexes
6. Rebuild dashboard snapshots
7. Validate: count checks, sample reads, required field checks
8. Switch `schemas/active.json`
9. Log migration report to `exports/migrations/`
10. Keep rollback artifact for retention window

### 22.6 Runtime schema handling

Every entity carries `schemaVersion`. On read:
- Matches active schema → use as-is
- Older version → apply in-memory transform (lazy upgrade)
- Newer version → reject (should not happen)

### 22.7 Rollback rule

Do not consider a schema active until validation completes successfully.

---

## 23. Component Versioning & Compatibility

### 23.1 Three independently versioned components

| Component | Version field | Where stored |
|-----------|--------------|-------------|
| Client app | `CONFIG.version` | Client bundle |
| Worker API | `WORKER_VERSION` | Worker code |
| R2 schema | `schemaVersion` | `schemas/active.json` |

### 23.2 Compatibility checks

| Check | Mechanism |
|-------|-----------|
| Client ↔ Worker | Client sends `apiVersion` header. Worker checks against `supportedApiVersions`. Incompatible → 426. |
| Worker ↔ R2 schema | Worker reads `schemas/active.json` on startup. Schema version not in supported range → maintenance mode. |
| Client freshness | Client calls `GET /api/meta/version` on load. If `minClientVersion` > client version → "update available" banner. |

### 23.3 Deployment manifest (`manifests/{id}.json`)

```json
{
  "manifestId": "20260401-001",
  "gitSha": "abc123",
  "environment": "prod",
  "client": {
    "version": "2.3.0",
    "apiVersion": "2.0",
    "deployTarget": "github-pages"
  },
  "worker": {
    "version": "2.3.0",
    "apiVersion": "2.0",
    "deployTarget": "cloudflare-workers"
  },
  "storage": {
    "engine": "R2",
    "schemaVersion": "2026.04.15-01",
    "bucket": "tarot"
  },
  "compatibility": {
    "minClientVersion": "2.0.0",
    "supportedApiVersions": ["2.0"]
  }
}
```

---

## 24. Analytics, Events & Dashboard

### 24.1 Strategy

Never compute dashboard metrics by scanning live entity objects. Use precomputed snapshots updated on each write.

### 24.2 Events tracked

| Event | When | Data |
|-------|------|------|
| `session_start` | App loads | device, screen, version, location |
| `card_flip` | Card flipped | card name, slot index, reversed |
| `reading_request` | AI reading starts | spread, cards, lang, tone, question, topic |
| `reading_complete` | AI returns | provider, model, response_time, success |
| `followup_question` | User asks Q&A | question text, turn number |
| `user_context_update` | AI extracts user info | delta applied (name, traits) |
| `tts_play` | Audio plays | panel, lang, voice, source (eleven/browser) |
| `tts_fallback` | ElevenLabs failed | reason (quota/error), fell back to browser |
| `lang_change` | Language switched | from, to |
| `tone_change` | Tone switched | from, to |
| `theme_change` | Theme switched | from, to |
| `copy_text` | Copy button used | which panel |
| `stt_used` | Speech input used | lang, duration |
| `settings_opened` | Settings panel opened | — |
| `error` | Any error | type, message, stack |

### 24.3 Dashboard pages

| Page | Data source | Content |
|------|-------------|---------|
| **Overview** | `analytics/dashboard/overview.json` | Sessions, users, readings, follow-ups, success rate, top languages, top countries, recent activity |
| **User list** | `indexes/users/*` | Paginated table: name, traits count, readings, languages, last seen. Search/filter. |
| **User profile** | `entities/users/{uid}` + `indexes/games/by-user/{uid}` | Full profile, traits badges, location history, games list |
| **Game detail** | `entities/games/{id}` + `entities/turns/{id}/*` | Cards, question, full reading, all follow-up turns, user context changes timeline |
| **Version health** | `analytics/dashboard/version-health.json` | Active schema, client versions in use, error rates |
| **Security incidents** | `indexes/incidents/*` + `entities/incidents/*` | Severity, date, evidence |
| **Errors** | Event indexes | Failed readings, TTS errors, stack traces |

### 24.4 Dashboard navigation flow

```text
Overview
  └→ User list
       └→ User profile
             ├→ Game detail (click any game)
             │    └→ Full conversation thread with all turns
             └→ Back to user list
  └→ Recent readings (click any)
       └→ Game detail
```

---

## 25. Security Model

### 25.1 SQL injection

Not a risk with R2-only persistence. But storage safety is still required.

### 25.2 Storage-layer risks and defenses

| Risk | Defense |
|------|---------|
| Key/path injection | Object keys generated server-side only, normalized, never from raw user text |
| Unintended overwrite | Only validated IDs in key segments |
| Prompt injection | Strict templates, delimited user input, structured JSON output parsing, suspicious payload logging |
| TTS abuse | Monthly character budget, per-uid rate limiting |
| Admin-route abuse | Analytics key required, no user-facing filter-to-query passthrough |
| Notification abuse | Rate-limited, owner-only notification path |

### 25.3 Rate limiting

| Limit | Value |
|-------|-------|
| Readings per uid per hour | 20 |
| Events per uid per minute | 100 |
| TTS characters per month (free tier) | 10,000 |

### 25.4 Incident response

1. Write evidence to `incidents/evidence/{id}.json`
2. Write summary to `entities/incidents/{id}.json`
3. Update severity/date indexes
4. Update security dashboard snapshot
5. Trigger owner notification

---

## 26. UI Refactoring Priorities

| Priority | Component | Notes |
|----------|-----------|-------|
| **P0** | Colour tokens (CSS custom properties) | Foundation for all UI |
| **P0** | Bottom bar restructure | Remove old lang/tone pills, add Settings gear + Buy me |
| **P0** | Settings slide-up panel | Language, Tone, Theme, Voice, Speed, Font |
| **P1** | Question input (layout 1-A) | Mic orb + text field + topic chips below |
| **P1** | Custom icon set | OrbMic, MoonSpeaker, StarwheelSettings (see `tarot-new-6-icons.jsx` reference) |
| **P1** | Scroll cue | Pulsing chevron after card reveal |
| **P1** | Copy controls | Per-panel copy + full reading copy |
| **P2** | Audio playback bar | Sticky bar with speed selector |
| **P2** | Per-panel speaker buttons | TTS for individual reading sections |
| **P3** | Voice Mode | 4-phase immersive mode — stub for now, full implementation later |

### Icon styles reference

`tarot-new-6-icons.jsx` contains 10 material/style treatments for 6 icon shapes (mic, speaker, settings, copy, send, close): Stone, Bronze, Glass, Aerial, and others. Evaluate and select during implementation.

### UI mocks reference

`tarot-ui-mocks-v3.jsx` contains phone-frame mockups for topic input layouts, card display, bottom bar, and reading panels.

---

## 27. Settings & Client Persistence

### localStorage keys

| Key | Type | Description |
|-----|------|-------------|
| `tarot_uid` | string | Anonymous user UUID |
| `tarot_lang` | string | Language code |
| `tarot_tone` | string | Tone name |
| `tarot_theme` | string | Theme ID |
| `tarot_voice_id` | string | Voice ID override |
| `tarot_tts_speed` | number | TTS playback speed |
| `tarot_font` | string | Reading font family |
| `tarot_user_name` | string | Name (AI-extracted) |
| `tarot_user_gender` | string | Gender (AI-extracted) |
| `tarot_user_birthdate` | string | Birthdate (AI-extracted) |
| `tarot_user_traits` | JSON string | Extensible KV traits map |
| `tarot_total_readings` | number | Lifetime reading count |
| `tarot_version` | string | Last seen app version |

### Restore on load

```ts
const userContext = new UserContext();
userContext.restore(); // reads all localStorage keys
```

---

## 28. Testing Strategy

### 28.1 Test types

| Type | Scope | Tooling |
|------|-------|---------|
| **Unit tests** | Services, models, utilities, repositories | Vitest |
| **Integration tests** | API handlers with mocked R2 | Miniflare |
| **E2E smoke tests** | Full flow through deployed stack | Manual checklist + optional Playwright |
| **Contract tests** | API schemas, schema descriptors, manifests | Vitest + schema validators |

### 28.2 Unit test scope

- UserContext merge logic (`applyAiUpdate`)
- GameContext state transitions (`addQA`, `toPromptContext`)
- FallbackTTS fallback path
- R2 repositories (with mocked R2 adapter)
- Token budget calculation
- Prompt response parsing
- Compatibility/version checks
- Progress-reporting service methods

### 28.3 Integration test scope

- Full reading flow (request → AI → distillation → R2 write → index update)
- Follow-up flow with digest accumulation
- Schema migration + activation
- TTS budget tracking + 429 fallback
- Deployment verification

### 28.4 Phase smoke test checklists

**Phase 0 (Foundation):**
- [ ] Vite dev server starts, app loads
- [ ] UserContext restores from localStorage
- [ ] GameContext tracks card draws correctly
- [ ] Existing functionality matches current production

**Phase 1 (Models + DI):**
- [ ] DI wiring works in composition root
- [ ] TTS/STT interfaces resolve correctly
- [ ] Progress reporting fires on long operations

**Phase 2 (Reading + Distillation):**
- [ ] Single card reading works (ENG)
- [ ] 3-card reading works (RUS)
- [ ] Worker returns 3-part response
- [ ] `contextUpdate` stored as `readingDigest`
- [ ] `userContextDelta` merges into UserContext
- [ ] Failed AI request returns error (not crash)

**Phase 3 (R2 Storage):**
- [ ] Session start writes user + session to R2
- [ ] Reading writes game + turn + indexes
- [ ] User profile accumulates across sessions
- [ ] Dashboard reads precomputed snapshots

**Phase 4 (Schema):**
- [ ] `schemas/active.json` readable
- [ ] Schema upgrade transforms entities correctly
- [ ] Index rebuild produces valid indexes
- [ ] Rollback restores previous state

**Phase 5 (Voice):**
- [ ] TTS plays reading (ElevenLabs when available)
- [ ] TTS falls back to browser when quota exceeded
- [ ] STT transcribes question
- [ ] Audio bar shows playback controls

**Phase 6 (Dashboard):**
- [ ] Dashboard shows real data from R2 snapshots
- [ ] User drill-down works
- [ ] Game detail shows full conversation thread

---

## 29. Deployment Scripts

PowerShell-first:

```text
scripts/
  build-all.ps1
  deploy-all.ps1
  deploy-client.ps1
  deploy-worker.ps1
  deploy-r2-schema.ps1
  rebuild-indexes.ps1
  export-r2.ps1
  verify-deploy.ps1
  rollback-schema.ps1
  notify-owner.ps1
```

### `deploy-all.ps1` responsibilities

1. Build manifest
2. Run checks/tests
3. Detect stale components
4. Deploy Worker(s)
5. Run R2 schema migration if needed
6. Rebuild indexes/snapshots if needed
7. Deploy client
8. Verify `GET /api/meta/version`
9. Upload deployment report

### `-Force` mode

Redeploy and reverify all components even if nothing appears stale. Includes:
- Full client rebuild
- Worker redeploy
- Manifest republish
- R2 export
- Schema migration/reindex
- Dashboard snapshot rebuild
- Live compatibility verification

---

## 30. Migration Phases

### Phase 0 — Dev repo foundation
1. Create/refine `apps/tarot-dev`
2. Set up TypeScript + Vite
3. Set up Lit component islands where needed
4. Add GitHub Actions Pages workflow
5. Add Vitest, base testing/tooling
6. **Test:** Phase 0 checklist

### Phase 1 — Core models and DI
1. Implement `UserContext` with all methods
2. Implement `GameContext` with all methods
3. Build composition root with DI wiring
4. Add TTS/STT interface abstractions
5. Add API service contracts with progress/retry
6. **Test:** Phase 1 checklist

### Phase 2 — Reading and distillation pipeline
1. Deploy `tarot-api` Worker with `/api/reading`, `/api/followup`, `/api/session`, `/api/meta/version`
2. Implement prompt assembly with distillation instructions
3. Implement AI router (Gemini -> Anthropic fallback)
4. Enforce structured 3-part response
5. Merge `userContextDelta` on client
6. Persist digest-only history
7. Remove all API keys from client
8. Generate OpenAPI spec
9. **Test:** Phase 2 checklist

### Phase 3 — R2 persistence foundation
1. Set up R2 bucket with object key conventions
2. Define entity document contracts in `shared/`
3. Implement R2 adapter and repository base classes
4. Implement specialized repositories (user, game, analytics, version, incident)
5. Implement index writer service
6. Add session/reading/turn write flows
7. Create initial schema descriptor
8. Set `schemas/active.json`
9. **Test:** Phase 3 checklist

### Phase 4 — Schema activation model
1. Add version descriptor format
2. Add export/migrate/reindex scripts
3. Add validation and rollback logic
4. Test full migration cycle
5. **Test:** Phase 4 checklist

### Phase 5 — Voice and fallback
1. Set up ElevenLabs account, select voices
2. Add `/api/tts` endpoint with budget tracking + R2 cache
3. Implement `ElevenLabsTtsService`, `BrowserTtsService`, `FallbackTtsService`
4. Implement `BrowserSttService` for mic orb
5. Add per-panel speaker buttons
6. Build global audio bar
7. **Test:** Phase 5 checklist

### Phase 6 — UI overhaul
1. Implement colour tokens (CSS custom properties)
2. Replace bottom bar (settings gear + buy me)
3. Build settings slide-up panel
4. Build question input (1-A: mic orb + text + chips)
5. Add custom icon set
6. Add scroll cue, copy controls
7. **Test:** UI matches mock references

### Phase 7 — Dashboard and operations
1. Build dashboard UI (separate Vite entry point)
2. Deploy analytics Worker
3. Wire all event logging from client
4. Implement precomputed dashboard snapshots
5. Build rebuild-indexes script
6. **Test:** Phase 6 checklist

### Phase 8 — Hardening
1. Add optimistic concurrency (etagVersion) to entity updates
2. Add repair/rebuild jobs to tarot-admin Worker
3. Add incident capture and notification
4. Add rate limiting enforcement
5. Security audit: key injection, prompt injection, TTS abuse
6. Performance tuning: reduce index fan-out, batch writes, archive old data
7. Stronger tests across all paths

### Phase 9 — Voice Mode (future)
1. 4-phase immersive voice mode
2. Waveform visualizer
3. Section-by-section narration
4. **Test:** Full voice mode flow E2E

---

## 31. Open Questions

| # | Question | Impact | Proposed Default |
|---|----------|--------|-----------------|
| 1 | ElevenLabs voice IDs — browse library, select 2 | Phase 5 blocked | Placeholder IDs, swap later |
| 2 | Cloudflare Worker subdomain name | Config URL | `tarot-api` |
| 3 | Font loading — Google Fonts or system only? | Page load speed | System for body, Google for title |
| 4 | Voice Mode auto-play after card flip? | Accessibility | No auto-play; require tap |
| 5 | Max follow-ups per game session? | Token budget | 10, then suggest new reading |
| 6 | PWA service worker for static assets? | Performance | Yes, cache deck SVGs + CSS |
| 7 | Show ElevenLabs character budget to user? | UX | Subtle "premium voice" indicator |
| 8 | Lit adoption scope — all UI or interactive only? | Complexity | Interactive only (cards, panels, settings) |
| 9 | Dashboard auth — analytics key enough? | Security | Yes for now, add proper auth in Phase 8 |
| 10 | Offline reading fallback? | Scope | No. TTS falls back to browser; readings require network. |

---

*End of refactoring plan v2.3. Next step: approve plan → begin Phase 0 in `apps/tarot-dev`.*
