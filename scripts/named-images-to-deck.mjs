#!/usr/bin/env node
/**
 * Convert a deck folder using the standard naming convention to deck.json.
 *
 * Expected files in source folder:
 *   - Major00.jpg ... Major21.jpg (22 major arcana in standard order)
 *   - Wands01.jpg ... Wands14.jpg (Ace through King)
 *   - Cups01.jpg ... Cups14.jpg
 *   - Swords01.jpg ... Swords14.jpg
 *   - Coins01.jpg ... Coins14.jpg (treated as Pentacles)
 *   - Back.jpg (optional card back)
 *
 * Usage:
 *   node scripts/named-images-to-deck.mjs <source-dir> <deck-id> [--scale 0.5] [--label "Name"] [--desc "..."]
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const MAJOR_ARCANA = [
    'The Fool', 'The Magician', 'The High Priestess', 'The Empress',
    'The Emperor', 'The Hierophant', 'The Lovers', 'The Chariot',
    'Strength', 'The Hermit', 'Wheel of Fortune', 'Justice',
    'The Hanged Man', 'Death', 'Temperance', 'The Devil',
    'The Tower', 'The Star', 'The Moon', 'The Sun',
    'Judgement', 'The World',
];

const RANKS = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
               'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King'];

// Folder prefix → suit name used in card names
const SUITS = {
    Wands:  'Wands',
    Cups:   'Cups',
    Swords: 'Swords',
    Coins:  'Pentacles',  // "Coins" in source → "Pentacles" in card names
};

function wrapSvg(base64Jpeg) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="none">` +
        `<image width="100%" height="100%" preserveAspectRatio="none" ` +
        `href="data:image/jpeg;base64,${base64Jpeg}"/>` +
        `</svg>`;
}

async function loadAndResize(sharp, filePath, scale) {
    const buffer = readFileSync(filePath);
    if (scale >= 1.0) {
        return buffer.toString('base64');
    }
    const meta = await sharp(buffer).metadata();
    const newWidth = Math.round(meta.width * scale);
    const resized = await sharp(buffer)
        .resize(newWidth)
        .jpeg({ quality: 80 })
        .toBuffer();
    return resized.toString('base64');
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node scripts/named-images-to-deck.mjs <source-dir> <deck-id> [--scale N] [--label "Name"] [--desc "Desc"]');
        process.exit(1);
    }

    const sourceDir = resolve(args[0]);
    const deckId = args[1];
    let scale = 0.5;
    let label = deckId.charAt(0).toUpperCase() + deckId.slice(1);
    let description = `${label} tarot deck`;

    for (let i = 2; i < args.length; i++) {
        if (args[i] === '--scale' && args[i + 1]) { scale = parseFloat(args[++i]); }
        if (args[i] === '--label' && args[i + 1]) { label = args[++i]; }
        if (args[i] === '--desc' && args[i + 1]) { description = args[++i]; }
    }

    const outDir = resolve(`client/public/decks/${deckId}`);
    mkdirSync(outDir, { recursive: true });

    console.log(`Converting "${label}" (${deckId})`);
    console.log(`  Source: ${sourceDir}`);
    console.log(`  Scale:  ${scale}`);

    const sharp = (await import('sharp')).default;
    const cards = {};

    // Major arcana: Major00 → The Fool, Major01 → The Magician, etc.
    for (let i = 0; i < 22; i++) {
        const filename = `Major${String(i).padStart(2, '0')}.jpg`;
        const filePath = join(sourceDir, filename);
        if (!existsSync(filePath)) {
            console.warn(`  MISSING: ${filename}`);
            continue;
        }
        const b64 = await loadAndResize(sharp, filePath, scale);
        cards[MAJOR_ARCANA[i]] = wrapSvg(b64);
        process.stdout.write(`\r  Major: ${i + 1}/22 - ${MAJOR_ARCANA[i]}        `);
    }
    console.log('');

    // Minor arcana: SuitNN → Rank of Suit
    for (const [prefix, suitName] of Object.entries(SUITS)) {
        for (let i = 0; i < 14; i++) {
            const filename = `${prefix}${String(i + 1).padStart(2, '0')}.jpg`;
            const filePath = join(sourceDir, filename);
            if (!existsSync(filePath)) {
                console.warn(`  MISSING: ${filename}`);
                continue;
            }
            const b64 = await loadAndResize(sharp, filePath, scale);
            const cardName = `${RANKS[i]} of ${suitName}`;
            cards[cardName] = wrapSvg(b64);
            process.stdout.write(`\r  ${suitName}: ${i + 1}/14 - ${cardName}              `);
        }
        console.log('');
    }

    // Card back (optional)
    let cardBackSvg = null;
    const backPath = join(sourceDir, 'Back.jpg');
    if (existsSync(backPath)) {
        const b64 = await loadAndResize(sharp, backPath, scale);
        cardBackSvg = wrapSvg(b64);
        console.log(`  Card back: Back.jpg`);
    }

    // Write deck.json
    const manifest = {
        id: deckId,
        label,
        description,
        ...(cardBackSvg ? { cardBack: cardBackSvg } : {}),
        cards,
    };

    const json = JSON.stringify(manifest);
    writeFileSync(join(outDir, 'deck.json'), json);

    const fileMB = (Buffer.byteLength(json) / 1024 / 1024).toFixed(1);
    console.log(`\nDone! ${Object.keys(cards).length} cards → deck.json (${fileMB} MB)`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
