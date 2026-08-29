import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * card-art-registry keeps module-level state (current/resolved deck,
 * discovered index), so every test re-imports a fresh copy via
 * vi.resetModules() and drives discovery through a stubbed fetch.
 */

const ASSET_INDEX = [
    { id: 'mermaids', label: 'Mermaids', description: 'Sea-themed cards' },
    { id: 'karina', label: 'Karina', description: 'Hand-drawn deck' },
];

// Pool order inside the registry: [...assetDecks, ...builtins]
// => ['mermaids', 'karina', 'classic', 'cats']

function stubFetch(): void {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('decks/index.json')) {
            return new Response(JSON.stringify(ASSET_INDEX), { status: 200 });
        }
        const match = url.match(/decks\/([^/]+)\/deck\.json$/);
        if (match) {
            return new Response(JSON.stringify({
                id: match[1],
                label: match[1],
                description: 'test deck',
                cards: { 'The Fool': '<svg>fool</svg>' },
            }), { status: 200 });
        }
        return new Response('not found', { status: 404 });
    }));
}

async function importRegistry() {
    vi.resetModules();
    return await import('../src/ui/components/card-art-registry.js');
}

beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    stubFetch();
});

describe('card-art-registry — Random deck', () => {
    it('lists Random first in the available styles', async () => {
        const reg = await importRegistry();
        await reg.initDeckStyle();
        const styles = reg.getAvailableDeckStyles();
        expect(styles[0].id).toBe('random');
        expect(styles.map(s => s.id)).toEqual(
            ['random', 'mermaids', 'karina', 'classic', 'cats']);
    });

    it('defaults new users (no stored deck) to Random', async () => {
        const reg = await importRegistry();
        await reg.initDeckStyle();
        expect(reg.getCurrentDeckStyle()).toBe('random');
        expect(localStorage.getItem('tarot-deck-style')).toBe('random');
        expect(localStorage.getItem('tarot-deck-migration-v2')).toBe('1');
    });

    it('resolves Random to a real deck, never to random itself', async () => {
        const reg = await importRegistry();
        await reg.initDeckStyle();
        const resolved = reg.getResolvedDeckStyle();
        expect(resolved).not.toBe('random');
        expect(['mermaids', 'karina', 'classic', 'cats']).toContain(resolved);
    });

    it('switches existing users to Random exactly once', async () => {
        localStorage.setItem('tarot-deck-style', 'community');
        localStorage.setItem('tarot-deck-migration-v1', '1');
        // No v2 flag yet -> forced switch on this load.
        const reg = await importRegistry();
        await reg.initDeckStyle();
        expect(reg.getCurrentDeckStyle()).toBe('random');
        expect(localStorage.getItem('tarot-deck-migration-v2')).toBe('1');
    });

    it('respects a stored deck once the v2 switch has run', async () => {
        localStorage.setItem('tarot-deck-style', 'karina');
        localStorage.setItem('tarot-deck-migration-v2', '1');
        const reg = await importRegistry();
        await reg.initDeckStyle();
        expect(reg.getCurrentDeckStyle()).toBe('karina');
        expect(reg.getResolvedDeckStyle()).toBe('karina');
    });

    it('persists a user override across app loads (never re-forced)', async () => {
        // First load: forced to Random.
        let reg = await importRegistry();
        await reg.initDeckStyle();
        expect(reg.getCurrentDeckStyle()).toBe('random');
        // User explicitly picks a deck.
        await reg.setDeckStyle('mermaids');
        expect(localStorage.getItem('tarot-deck-style')).toBe('mermaids');
        // Next load keeps the override.
        reg = await importRegistry();
        await reg.initDeckStyle();
        expect(reg.getCurrentDeckStyle()).toBe('mermaids');
        expect(reg.getResolvedDeckStyle()).toBe('mermaids');
    });

    it('re-rolls when the user selects Random in Settings', async () => {
        const reg = await importRegistry();
        await reg.initDeckStyle();
        const random = vi.spyOn(Math, 'random');
        random.mockReturnValue(0);            // -> pool[0] = mermaids
        await reg.setDeckStyle('random');
        expect(reg.getResolvedDeckStyle()).toBe('mermaids');
        random.mockReturnValue(0.3);          // floor(0.3 * 4) = 1 -> karina
        await reg.setDeckStyle('random');
        expect(reg.getResolvedDeckStyle()).toBe('karina');
    });

    it('rerollRandomDeck picks a new deck for each reading', async () => {
        const reg = await importRegistry();
        await reg.initDeckStyle();            // new user -> random
        const random = vi.spyOn(Math, 'random');
        random.mockReturnValue(0);
        await reg.rerollRandomDeck();
        expect(reg.getResolvedDeckStyle()).toBe('mermaids');
        random.mockReturnValue(0.3);
        await reg.rerollRandomDeck();
        expect(reg.getResolvedDeckStyle()).toBe('karina');
    });

    it('rerollRandomDeck is a no-op for an explicitly chosen deck', async () => {
        const reg = await importRegistry();
        await reg.initDeckStyle();
        await reg.setDeckStyle('karina');
        const random = vi.spyOn(Math, 'random').mockReturnValue(0);
        await reg.rerollRandomDeck();
        expect(reg.getCurrentDeckStyle()).toBe('karina');
        expect(reg.getResolvedDeckStyle()).toBe('karina');
        expect(random).not.toHaveBeenCalled();
    });

    it('serves card art from the resolved deck while selection stays random', async () => {
        const reg = await importRegistry();
        await reg.initDeckStyle();
        vi.spyOn(Math, 'random').mockReturnValue(0); // -> mermaids (asset deck)
        await reg.setDeckStyle('random');
        expect(reg.getCurrentDeckStyle()).toBe('random');
        expect(reg.getCardArt('The Fool', 100, 180)).toBe('<svg>fool</svg>');
    });

    it('falls back to classic when no decks can be discovered', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('fail', { status: 500 })));
        const reg = await importRegistry();
        await reg.initDeckStyle();            // new user -> random
        // Pool is only the builtins now; resolution must still avoid 'random'.
        expect(['classic', 'cats']).toContain(reg.getResolvedDeckStyle());
    });
});
