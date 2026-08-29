/**
 * Card art registry — manages switchable card art sets (deck styles).
 * Each deck provides: cardBackSvg(w,h) and getCardArt(cardName, w, h).
 *
 * Selectable decks are asset decks only: a single deck.json with all SVGs
 * inline, auto-discovered via decks/index.json. Asset decks are lazy-loaded:
 * only index.json (lightweight) is fetched at startup; the full deck.json
 * (~MB) is fetched and cached when a deck is selected or rolled.
 *
 * The old built-in decks (classic, cats) were retired in v2.4.8 — they are
 * not listed, never picked by Random, and a stored selection of either is
 * switched to Random on load. The classic module survives only as the
 * internal render fallback while an asset deck is loading or discovery
 * failed (offline first paint).
 */

import * as classicDeck from './card-art.js';

export interface CardArtProvider {
    cardBackSvg(w: number, h: number): string;
    getCardArt(cardName: string, w: number, h: number): string | null;
}

export interface DeckStyleInfo {
    id: string;
    label: string;
    description: string;
}

interface AssetDeckManifest {
    id: string;
    label: string;
    description: string;
    cardBack?: string;
    cards: Record<string, string>;
}

const STORAGE_KEY = 'tarot-deck-style';
const MIGRATION_KEY = 'tarot-deck-migration-v1';
/** v2: one-time switch of every user to the Random deck (new default). */
const MIGRATION_V2_KEY = 'tarot-deck-migration-v2';
const FETCH_TIMEOUT_MS = 30_000;
const BASE_PATH = import.meta.env.BASE_URL ?? '/';

/**
 * Pseudo-deck: picks one of the real decks at random on every app load
 * (and again whenever the user re-selects it in Settings).
 */
export const RANDOM_DECK_ID = 'random';
const RANDOM_DECK: DeckStyleInfo = {
    id: RANDOM_DECK_ID,
    label: 'Random',
    description: 'A different deck every visit',
};

let _currentStyleId = RANDOM_DECK_ID;
/**
 * The deck actually rendered. Equal to _currentStyleId except when the
 * selection is 'random', in which case this holds the randomly chosen deck.
 * 'classic' here means the internal fallback renderer (not selectable).
 */
let _resolvedStyleId = 'classic';
/** Lightweight index entries (id + label + description only) */
let _assetDeckIndex: DeckStyleInfo[] = [];
/** Fully loaded asset deck providers (cached after first load) */
let _assetProviders = new Map<string, AssetDeckProvider>();

// ── Asset deck provider: all SVGs loaded inline from deck.json ──

class AssetDeckProvider implements CardArtProvider {
    constructor(private _manifest: AssetDeckManifest) {}

    cardBackSvg(w: number, h: number): string {
        return this._manifest.cardBack ?? classicDeck.cardBackSvg(w, h);
    }

    getCardArt(cardName: string, _w: number, _h: number): string | null {
        return this._manifest.cards[cardName] ?? null;
    }
}

// ── Lazy-load an asset deck's full manifest ──

async function loadAssetDeck(deckId: string): Promise<AssetDeckProvider | null> {
    const cached = _assetProviders.get(deckId);
    if (cached) return cached;

    try {
        const r = await fetch(`${BASE_PATH}decks/${deckId}/deck.json`, {
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!r.ok) return null;
        const manifest = await r.json() as AssetDeckManifest;
        const provider = new AssetDeckProvider(manifest);
        _assetProviders.set(deckId, provider);
        return provider;
    } catch {
        return null;
    }
}

// ── Discovery: fetch only the lightweight index ──

async function discoverAssetDecks(): Promise<DeckStyleInfo[]> {
    try {
        const res = await fetch(`${BASE_PATH}decks/index.json`, {
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
}

// ── Public API ──

/** Get all available deck styles (Random first, then asset decks) */
export function getAvailableDeckStyles(): DeckStyleInfo[] {
    return [RANDOM_DECK, ..._assetDeckIndex];
}

/** The pool Random draws from: every asset deck, never Random itself. */
function realDeckPool(): DeckStyleInfo[] {
    return [..._assetDeckIndex];
}

/** Pick a random real deck and load it. Returns the chosen deck id.
 *  If discovery found nothing (offline), falls back to the internal
 *  classic renderer so cards still paint. */
async function resolveRandomDeck(): Promise<string> {
    const pool = realDeckPool();
    if (pool.length === 0) return 'classic';
    const chosen = pool[Math.floor(Math.random() * pool.length)].id;
    await loadDeckById(chosen);
    return chosen;
}

/** Ensure an asset deck's provider is loaded. */
async function loadDeckById(deckId: string): Promise<void> {
    if (_assetDeckIndex.some(d => d.id === deckId)) {
        await loadAssetDeck(deckId);
    }
}

/** Get the provider for a given style (sync — returns cached or fallback) */
function getProviderSync(styleId: string): CardArtProvider {
    const assetProvider = _assetProviders.get(styleId);
    if (assetProvider) return assetProvider;
    return classicDeck;
}

/** Initialize: discover deck list, restore saved style, load active deck */
export async function initDeckStyle(): Promise<void> {
    // Fetch lightweight index (just ids + labels)
    _assetDeckIndex = await discoverAssetDecks();

    // Restore saved selection, applying one-time default/migration if not done
    const saved = localStorage.getItem(STORAGE_KEY);
    const migrationV2Done = localStorage.getItem(MIGRATION_V2_KEY) === '1';

    if (saved === null || !migrationV2Done) {
        // New user, or existing user seen for the first time since the Random
        // deck shipped: default/switch to Random. One-time only — the user's
        // next explicit Settings choice persists and is never overridden.
        _currentStyleId = RANDOM_DECK_ID;
        localStorage.setItem(STORAGE_KEY, _currentStyleId);
    } else {
        _currentStyleId = saved;
    }
    // Mark both migrations done (v1's rename pass is subsumed by the v2 switch).
    localStorage.setItem(MIGRATION_KEY, '1');
    localStorage.setItem(MIGRATION_V2_KEY, '1');

    // A stored selection that no longer exists — the retired built-ins
    // ('classic', 'cats') or any stale id — switches to Random. Persist the
    // switch only when the deck list actually loaded: an offline start makes
    // every asset id look unknown and must not clobber a valid stored choice.
    const allStyles = getAvailableDeckStyles();
    if (!allStyles.some(s => s.id === _currentStyleId)) {
        _currentStyleId = RANDOM_DECK_ID;
        if (_assetDeckIndex.length > 0) {
            localStorage.setItem(STORAGE_KEY, _currentStyleId);
        }
    }

    // Load the active deck (resolving Random to a real deck for this visit)
    if (_currentStyleId === RANDOM_DECK_ID) {
        _resolvedStyleId = await resolveRandomDeck();
    } else {
        _resolvedStyleId = _currentStyleId;
        await loadDeckById(_resolvedStyleId);
    }
}

/** Get the current deck style ID (the user's selection, e.g. 'random') */
export function getCurrentDeckStyle(): string {
    return _currentStyleId;
}

/** Get the deck actually rendered (Random resolved to a real deck) */
export function getResolvedDeckStyle(): string {
    return _resolvedStyleId;
}

/** Switch deck style, persist, and load the deck if needed.
 *  Selecting Random re-rolls immediately (and on every future app load). */
export async function setDeckStyle(styleId: string): Promise<void> {
    _currentStyleId = styleId;
    localStorage.setItem(STORAGE_KEY, styleId);

    if (styleId === RANDOM_DECK_ID) {
        _resolvedStyleId = await resolveRandomDeck();
    } else {
        _resolvedStyleId = styleId;
        await loadDeckById(styleId);
    }
}

/** Re-roll the Random deck for a new reading. No-op unless the user's
 *  selection is Random — an explicitly chosen deck is never changed. */
export async function rerollRandomDeck(): Promise<void> {
    if (_currentStyleId !== RANDOM_DECK_ID) return;
    _resolvedStyleId = await resolveRandomDeck();
}

/** Get card back SVG for the deck in use */
export function cardBackSvg(w: number, h: number): string {
    return getProviderSync(_resolvedStyleId).cardBackSvg(w, h);
}

/** Get card face art for the deck in use */
export function getCardArt(cardName: string, w: number, h: number): string | null {
    return getProviderSync(_resolvedStyleId).getCardArt(cardName, w, h);
}
