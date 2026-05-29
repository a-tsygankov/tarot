/**
 * Tarot deck definition + draw helper.
 * Single source of truth for the card pool used by card-spread and clarification draws.
 */

export const MAJOR_ARCANA = [
    'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
    'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
    'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
    'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun',
    'Judgement', 'The World',
];

export const MINOR_SUITS = ['Wands', 'Cups', 'Swords', 'Pentacles'];
export const MINOR_RANKS = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
    'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King'];

/** Full 78-card deck as a flat list of names. */
export function buildFullDeck(): string[] {
    const cards: string[] = [...MAJOR_ARCANA];
    for (const suit of MINOR_SUITS) {
        for (const rank of MINOR_RANKS) {
            cards.push(`${rank} of ${suit}`);
        }
    }
    return cards;
}

/**
 * Draw a random card name not already used.
 * Returns null only if the entire deck is exhausted.
 */
export function drawRandomCard(usedNames: Iterable<string>): string | null {
    const used = new Set(usedNames);
    const available = buildFullDeck().filter(name => !used.has(name));
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
}
