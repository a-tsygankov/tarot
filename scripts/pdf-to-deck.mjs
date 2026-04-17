#!/usr/bin/env node
/**
 * Convert a tarot card PDF into a merged deck.json.
 *
 * Usage:
 *   node scripts/pdf-to-deck.mjs <pdf-path> <deck-id> [--scale 0.75] [--label "Name"] [--desc "Description"] [--back path/to/back.svg]
 *
 * Expects the PDF to contain card images in order:
 *   - Optional cover/non-card images (filtered by aspect ratio)
 *   - 22 Major Arcana (The Fool through The World)
 *   - 14 Wands (Ace through King)
 *   - 14 Cups
 *   - 14 Swords
 *   - 14 Pentacles
 *
 * Requires: pip install pymupdf, npm install sharp
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';

// ── Card name sequences ──
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

const SUITS = ['Wands', 'Cups', 'Swords', 'Pentacles'];

function buildCardNames() {
    const names = [...MAJOR_ARCANA];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            names.push(`${rank} of ${suit}`);
        }
    }
    return names; // 78 total
}

function wrapSvg(base64Jpeg) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="none">` +
        `<image width="100%" height="100%" preserveAspectRatio="none" ` +
        `href="data:image/jpeg;base64,${base64Jpeg}"/>` +
        `</svg>`;
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node scripts/pdf-to-deck.mjs <pdf-path> <deck-id> [--scale N] [--label "Name"] [--desc "Desc"] [--back path]');
        process.exit(1);
    }

    const pdfPath = resolve(args[0]);
    const deckId = args[1];
    let scale = 0.75;
    let backPath = null;
    let label = deckId.charAt(0).toUpperCase() + deckId.slice(1);
    let description = `${label} tarot deck`;

    for (let i = 2; i < args.length; i++) {
        if (args[i] === '--scale' && args[i + 1]) { scale = parseFloat(args[++i]); }
        if (args[i] === '--back' && args[i + 1]) { backPath = resolve(args[++i]); }
        if (args[i] === '--label' && args[i + 1]) { label = args[++i]; }
        if (args[i] === '--desc' && args[i + 1]) { description = args[++i]; }
    }

    const outDir = resolve(`client/public/decks/${deckId}`);
    mkdirSync(outDir, { recursive: true });

    console.log(`Converting PDF to deck "${label}" (${deckId})`);
    console.log(`  PDF:    ${pdfPath}`);
    console.log(`  Output: ${outDir}`);
    console.log(`  Scale:  ${scale}`);

    // ── Extract card images via Python/PyMuPDF ──
    console.log('\nExtracting images from PDF...');
    const scriptDir = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
    const pyScript = join(scriptDir, 'extract-pdf-cards.py');

    const pyResult = execSync(`python "${pyScript}" "${pdfPath}"`, {
        maxBuffer: 500 * 1024 * 1024,
    }).toString();

    const lines = pyResult.trim().split('\n');
    const imageCount = parseInt(lines[0]);
    console.log(`  Found ${imageCount} card images`);

    // Skip non-card images (cover etc.) — we need exactly 78
    const startIdx = imageCount - 78;
    if (startIdx < 0) {
        console.error(`Expected at least 78 card images, found ${imageCount}`);
        process.exit(1);
    }
    if (startIdx > 0) {
        console.log(`  Skipping first ${startIdx} non-card image(s)`);
    }

    // ── Load sharp for resizing ──
    let sharp;
    try {
        sharp = (await import('sharp')).default;
    } catch {
        console.error('sharp not available. Run: npm install sharp');
        process.exit(1);
    }

    // ── Build card mapping ──
    const cardNames = buildCardNames();
    const cards = {};
    let totalSize = 0;

    for (let i = 0; i < 78; i++) {
        const lineIdx = startIdx + i + 1; // +1 for the count line
        const { w, h, b64 } = JSON.parse(lines[lineIdx]);
        const imageBuffer = Buffer.from(b64, 'base64');

        let finalBase64;
        if (scale < 1.0) {
            const newWidth = Math.round(w * scale);
            const resized = await sharp(imageBuffer)
                .resize(newWidth)
                .jpeg({ quality: 80 })
                .toBuffer();
            finalBase64 = resized.toString('base64');
            if (i === 0) console.log(`  Resize: ${w}x${h} → ${newWidth}x${Math.round(h * scale)}`);
        } else {
            finalBase64 = b64;
        }

        totalSize += finalBase64.length;
        cards[cardNames[i]] = wrapSvg(finalBase64);
        process.stdout.write(`\r  Processing: ${i + 1}/78 - ${cardNames[i]}`);
    }
    console.log('');

    // ── Card back ──
    let cardBackSvg = null;
    if (backPath && existsSync(backPath)) {
        cardBackSvg = readFileSync(backPath, 'utf8');
        console.log(`  Card back: ${backPath}`);
    }

    // ── Write merged deck.json ──
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
    console.log(`\nDone! 78 cards → deck.json (${fileMB} MB)`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
