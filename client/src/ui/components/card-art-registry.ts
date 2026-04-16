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
const FETCH_TIMEOUT_MS = 30_000;
const BASE_PATH = import.meta.env.BASE_URL ?? '/';

let _currentStyleId = 'classic';
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

/** Get all available deck styles (built-in + discovered asset decks) */
export function getAvailableDeckStyles(): DeckStyleInfo[] {
    return [...BUILTIN_DECKS, ..._assetDeckIndex];
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

    // Restore saved selection
    _currentStyleId = localStorage.getItem(STORAGE_KEY) ?? 'classic';

    // Validate saved style still exists
    const allStyles = getAvailableDeckStyles();
    if (!allStyles.some(s => s.id === _currentStyleId)) {
        _currentStyleId = 'classic';
    }

    // Load the active deck
    if (_currentStyleId === 'cats') {
        await loadCatDeck();
    } else if (_assetDeckIndex.some(d => d.id === _currentStyleId)) {
        await loadAssetDeck(_currentStyleId);
    }
}

/** Get the current deck style ID */
export function getCurrentDeckStyle(): string {
    return _currentStyleId;
}

/** Switch deck style, persist, and load the deck if needed */
export async function setDeckStyle(styleId: string): Promise<void> {
    _currentStyleId = styleId;
    localStorage.setItem(STORAGE_KEY, styleId);

    if (styleId === 'cats') {
        await loadCatDeck();
    } else if (_assetDeckIndex.some(d => d.id === styleId)) {
        await loadAssetDeck(styleId);
    }
}

/** Get card back SVG for current style */
export function cardBackSvg(w: number, h: number): string {
    return getProviderSync(_currentStyleId).cardBackSvg(w, h);
}

/** Get card face art for current style */
export function getCardArt(cardName: string, w: number, h: number): string | null {
    return getProviderSync(_currentStyleId).getCardArt(cardName, w, h);
}
