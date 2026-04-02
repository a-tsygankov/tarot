/**
 * Card art registry — manages switchable card art sets (deck styles).
 * Each deck provides: cardBackSvg(w,h) and getCardArt(cardName, w, h).
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

/** Available deck styles */
export const DECK_STYLES: DeckStyleInfo[] = [
    { id: 'classic', label: 'Classic', description: 'Traditional tarot imagery' },
    { id: 'cats', label: 'Cat Tarot', description: 'Feline-themed cards' },
];

const STORAGE_KEY = 'tarot-deck-style';

let _currentStyleId = 'classic';
let _catDeckModule: CardArtProvider | null = null;

/** Lazy-load the cat deck module to avoid bundling if unused */
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

/** Get the provider for a given style, with sync fallback to classic */
function getProviderSync(styleId: string): CardArtProvider {
    if (styleId === 'cats' && _catDeckModule) {
        return _catDeckModule;
    }
    return classicDeck;
}

/** Initialize: restore saved style, preload if cats */
export async function initDeckStyle(): Promise<void> {
    _currentStyleId = localStorage.getItem(STORAGE_KEY) ?? 'classic';
    if (_currentStyleId === 'cats') {
        await loadCatDeck();
    }
}

/** Get the current deck style ID */
export function getCurrentDeckStyle(): string {
    return _currentStyleId;
}

/** Switch deck style and persist */
export async function setDeckStyle(styleId: string): Promise<void> {
    _currentStyleId = styleId;
    localStorage.setItem(STORAGE_KEY, styleId);
    if (styleId === 'cats') {
        await loadCatDeck();
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
