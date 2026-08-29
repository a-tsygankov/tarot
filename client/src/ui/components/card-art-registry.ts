/**
 * Card art registry — manages switchable card art sets (deck styles).
 * Each deck provides: cardBackSvg(w,h) and getCardArt(cardName, w, h).
 *
 * Supports two kinds of decks:
 *   1. Built-in (code-generated SVGs) — classic, cats
 *   2. Asset decks — single deck.json with all SVGs inline, auto-discovered
 *
 * Asset decks are lazy-loaded: only index.json (lightweight) is fetched at
 * startup. The full deck.json (~MB) is fetched and cached when the user
 * selects a deck.
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

// ── Built-in decks (always available) ──

const BUILTIN_DECKS: DeckStyleInfo[] = [
    { id: 'classic', label: 'Classic', description: 'Traditional tarot imagery' },
    { id: 'cats', label: 'Cat Tarot', description: 'Feline-themed cards' },
];

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

let _currentStyleId = 'classic';
/**
 * The deck actually rendered. Equal to _currentStyleId except when the
 * selection is 'random', in which case this holds the randomly chosen deck.
 */
let _resolvedStyleId = 'classic';
let _catDeckModule: CardArtProvider | null = null;
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

// ── Lazy-load the cat deck module ──

async function loadCatDeck(): Promise<CardArtProvider | null> {
    if (!_catDeckModule) {
        try {
            _catDeckModule = await import('./card-art-cats.js') as CardArtProvider;
        } catch {
            console.warn('Cat deck not available, falling back to classic');
            return null;
        }
    }
    return _catDeckModule;
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

/** Get all available deck styles (Random first, asset decks, built-in last) */
export function getAvailableDeckStyles(): DeckStyleInfo[] {
    return [RANDOM_DECK, ..._assetDeckIndex, ...BUILTIN_DECKS];
}

/** The pool Random draws from: every real deck, never Random itself. */
function realDeckPool(): DeckStyleInfo[] {
    return [..._assetDeckIndex, ...BUILTIN_DECKS];
}

/** Pick a random real deck and load it. Returns the chosen deck id. */
async function resolveRandomDeck(): Promise<string> {
    const pool = realDeckPool();
    if (pool.length === 0) return 'classic';
    const chosen = pool[Math.floor(Math.random() * pool.length)].id;
    await loadDeckById(chosen);
    return chosen;
}

/** Ensure a real deck's provider is loaded (no-op for classic). */
async function loadDeckById(deckId: string): Promise<void> {
    if (deckId === 'cats') {
        await loadCatDeck();
    } else if (_assetDeckIndex.some(d => d.id === deckId)) {
        await loadAssetDeck(deckId);
    }
}

/** Get the provider for a given style (sync — returns cached or fallback) */
function getProviderSync(styleId: string): CardArtProvider {
    if (styleId === 'cats' && _catDeckModule) return _catDeckModule;
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

    // Validate saved style still exists
    const allStyles = getAvailableDeckStyles();
    if (!allStyles.some(s => s.id === _currentStyleId)) {
        _currentStyleId = 'classic';
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
