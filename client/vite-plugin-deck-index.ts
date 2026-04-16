// Vite plugin: auto-generate public/decks/index.json from deck.json manifests.
// Scans public/decks/<id>/deck.json on build start and on change during dev.

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { Plugin } from 'vite';

interface DeckIndexEntry {
    id: string;
    label: string;
    description: string;
}

function generateIndex(publicDir: string): void {
    const decksDir = join(publicDir, 'decks');
    if (!existsSync(decksDir)) return;

    const entries: DeckIndexEntry[] = [];

    for (const dir of readdirSync(decksDir, { withFileTypes: true })) {
        if (!dir.isDirectory()) continue;
        const manifestPath = join(decksDir, dir.name, 'deck.json');
        if (!existsSync(manifestPath)) continue;

        try {
            const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
            entries.push({
                id: manifest.id ?? dir.name,
                label: manifest.label ?? dir.name,
                description: manifest.description ?? '',
            });
        } catch (e) {
            console.warn(`[deck-index] Failed to parse ${manifestPath}:`, e);
        }
    }

    writeFileSync(join(decksDir, 'index.json'), JSON.stringify(entries, null, 2));
    console.log(`[deck-index] Generated index.json with ${entries.length} deck(s)`);
}

export default function deckIndexPlugin(): Plugin {
    let publicDir = '';

    return {
        name: 'vite-plugin-deck-index',
        configResolved(config) {
            publicDir = config.publicDir;
        },
        buildStart() {
            generateIndex(publicDir);
        },
        handleHotUpdate({ file }) {
            if (file.endsWith('deck.json') && file.includes('decks')) {
                generateIndex(publicDir);
            }
        },
    };
}
