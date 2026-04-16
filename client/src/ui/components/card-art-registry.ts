/**
 * Card art registry — manages switchable card art sets (deck styles).
 * Each deck provides: cardBackSvg(w,h) and getCardArt(cardName, w, h).
 *
 * Supports two kinds of decks:
 *   1. Built-in (code-generated SVGs) — classic, cats
 *   2. Asset decks (SVG files in public/decks/<id>/) — auto-discovered at build time
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
const FETCH_TIMEOUT_MS = 10_000;
const BASE_PATH = import.meta.env.BASE_URL ?? '/';

let _currentStyleId = 'classic';
let _catDeckModule: CardArtProvider | null = null;
let _assetDecks: AssetDeckManifest[] = [];
let _assetProviders = new Map<string, AssetDeckProvider>();

// ── Change listeners — components call onDeckArtLoaded() to re-render ──

type DeckArtListener = () => void;
const _listeners = new Set<DeckArtListener>();

/** Register a callback that fires when new asset-deck SVGs finish loading. */
export function onDeckArtLoaded(fn: DeckArtListener): () => void {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
}

function _notifyListeners(): void {
    for (const fn of _listeners) fn();
}

// ── Asset deck provider: loads SVGs from public/decks/<id>/ ──

class AssetDeckProvider implements CardArtProvider {
    private _cache = new Map<string, string>();
    private _loading = new Map<string, Promise<string | null>>();

    constructor(
        private _manifest: AssetDeckManifest,
        private _basePath: string,
    ) {}

    private _url(filename: string): string {
        return `${this._basePath}decks/${this._manifest.id}/${filename}`;
    }

    private async _fetchSvg(filename: string): Promise<string | null> {
        const cached = this._cache.get(filename);
        if (cached) return cached;

        const existing = this._loading.get(filename);
        if (existing) return existing;

        const promise = fetch(this._url(filename), {
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        })
            .then(r => r.ok ? r.text() : null)
            .then(svg => {
                if (svg) {
                    this._cache.set(filename, svg);
                    _notifyListeners();
                }
                this._loading.delete(filename);
                return svg;
            })
            .catch(() => {
                this._loading.delete(filename);
                return null;
            });

        this._loading.set(filename, promise);
        return promise;
    }

    cardBackSvg(w: number, h: number): string {
        if (this._manifest.cardBack) {
            const cached = this._cache.get(this._manifest.cardBack);
            if (cached) return cached;
            void this._fetchSvg(this._manifest.cardBack);
        }
        return classicDeck.cardBackSvg(w, h);
    }

    getCardArt(cardName: string, w: number, h: number): string | null {
        const filename = this._manifest.cards[cardName];
        if (!filename) return classicDeck.getCardArt(cardName, w, h);

        const cached = this._cache.get(filename);
        if (cached) return cached;

        void this._fetchSvg(filename);
        return classicDeck.getCardArt(cardName, w, h);
    }

    /** Preload card SVGs in batches to avoid connection pool saturation */
    async preload(): Promise<void> {
        const files = Object.values(this._manifest.cards);
        if (this._manifest.cardBack) files.push(this._manifest.cardBack);

        // Batch in groups of 4 to stay within browser connection limits
        const BATCH_SIZE = 4;
        for (let i = 0; i < files.length; i += BATCH_SIZE) {
            const batch = files.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(f => this._fetchSvg(f)));
        }
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

// ── Discovery: fetch asset deck index, then each deck's full manifest ──

async function discoverAssetDecks(): Promise<AssetDeckManifest[]> {
    try {
        const res = await fetch(`${BASE_PATH}decks/index.json`, {
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok) return [];
        const index: { id: string; label: string; description: string }[] = await res.json();

        // Fetch full manifests (with card mappings) for each discovered deck
        const manifests = await Promise.all(index.map(async (entry) => {
            try {
                const r = await fetch(`${BASE_PATH}decks/${entry.id}/deck.json`, {
                    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
                });
                if (!r.ok) return null;
                return await r.json() as AssetDeckManifest;
            } catch {
                return null;
            }
        }));

        return manifests.filter((m): m is AssetDeckManifest => m !== null);
    } catch {
        return [];
    }
}

// ── Public API ──

/** Get all available deck styles (built-in + discovered asset decks) */
export function getAvailableDeckStyles(): DeckStyleInfo[] {
    const assetStyles = _assetDecks.map(d => ({
        id: d.id,
        label: d.label,
        description: d.description,
    }));
    return [...BUILTIN_DECKS, ...assetStyles];
}

/** For backward compat — same as getAvailableDeckStyles() */
export const DECK_STYLES = BUILTIN_DECKS;

/** Get the provider for a given style (sync — returns cached or fallback) */
function getProviderSync(styleId: string): CardArtProvider {
    if (styleId === 'cats' && _catDeckModule) return _catDeckModule;
    const assetProvider = _assetProviders.get(styleId);
    if (assetProvider) return assetProvider;
    return classicDeck;
}

/** Initialize: discover decks, restore saved style, preload if needed */
export async function initDeckStyle(): Promise<void> {
    // Discover asset decks
    _assetDecks = await discoverAssetDecks();

    // Create providers for all discovered decks
    for (const manifest of _assetDecks) {
        _assetProviders.set(manifest.id, new AssetDeckProvider(manifest, BASE_PATH));
    }

    // Restore saved selection
    _currentStyleId = localStorage.getItem(STORAGE_KEY) ?? 'classic';

    // Validate saved style still exists
    const allStyles = getAvailableDeckStyles();
    if (!allStyles.some(s => s.id === _currentStyleId)) {
        _currentStyleId = 'classic';
    }

    // Preload the active deck (non-blocking for asset decks —
    // they fall back to classic until SVGs arrive, then notify listeners)
    if (_currentStyleId === 'cats') {
        await loadCatDeck();
    } else {
        const assetProvider = _assetProviders.get(_currentStyleId);
        if (assetProvider) void assetProvider.preload();
    }
}

/** Get the current deck style ID */
export function getCurrentDeckStyle(): string {
    return _currentStyleId;
}

/** Switch deck style and persist. Starts preloading asset decks in background. */
export async function setDeckStyle(styleId: string): Promise<void> {
    _currentStyleId = styleId;
    localStorage.setItem(STORAGE_KEY, styleId);

    if (styleId === 'cats') {
        await loadCatDeck();
    } else {
        const assetProvider = _assetProviders.get(styleId);
        if (assetProvider) void assetProvider.preload();
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
