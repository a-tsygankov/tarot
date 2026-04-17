#!/usr/bin/env node
/**
 * Convert a folder of numbered card images + mapping file into a merged deck.json.
 *
 * Usage:
 *   node scripts/images-to-deck.mjs <image-dir> <mapping.json> <deck-id> [--scale 0.5] [--label "Name"] [--desc "Description"]
 *
 * The mapping.json maps filenames (without extension) to card names:
 *   { "1": "Seven of Wands", "2": "Eight of Wands", "19": "__BACK__", ... }
 * Use "__BACK__" to mark the card back image.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, resolve, extname, basename } from 'path';

function wrapSvg(base64, mimeType) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="none">` +
        `<image width="100%" height="100%" preserveAspectRatio="none" ` +
        `href="data:${mimeType};base64,${base64}"/>` +
        `</svg>`;
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.error('Usage: node scripts/images-to-deck.mjs <image-dir> <mapping.json> <deck-id> [--scale N] [--label "Name"] [--desc "Desc"]');
        process.exit(1);
    }

    const imageDir = resolve(args[0]);
    const mappingPath = resolve(args[1]);
    const deckId = args[2];
    let scale = 0.5;
    let label = deckId.charAt(0).toUpperCase() + deckId.slice(1);
    let description = `${label} tarot deck`;

    for (let i = 3; i < args.length; i++) {
        if (args[i] === '--scale' && args[i + 1]) { scale = parseFloat(args[++i]); }
        if (args[i] === '--label' && args[i + 1]) { label = args[++i]; }
        if (args[i] === '--desc' && args[i + 1]) { description = args[++i]; }
    }

    const outDir = resolve(`client/public/decks/${deckId}`);
    mkdirSync(outDir, { recursive: true });

    const mapping = JSON.parse(readFileSync(mappingPath, 'utf8'));

    // Find available image files
    const files = readdirSync(imageDir).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f));
    const fileMap = new Map();
    for (const f of files) {
        const key = basename(f, extname(f));
        fileMap.set(key, join(imageDir, f));
    }

    let sharp;
    try {
        sharp = (await import('sharp')).default;
    } catch {
        console.error('sharp not available. Run: npm install sharp');
        process.exit(1);
    }

    console.log(`Converting images to deck "${label}" (${deckId})`);
    console.log(`  Source: ${imageDir} (${files.length} files)`);
    console.log(`  Scale:  ${scale}`);

    const cards = {};
    let cardBackSvg = null;
    let totalSize = 0;
    let count = 0;

    for (const [fileKey, cardName] of Object.entries(mapping)) {
        const filePath = fileMap.get(fileKey);
        if (!filePath) {
            console.warn(`  MISSING: ${fileKey}`);
            continue;
        }

        const imageBuffer = readFileSync(filePath);
        const metadata = await sharp(imageBuffer).metadata();

        let finalBuffer;
        if (scale < 1.0) {
            const newWidth = Math.round(metadata.width * scale);
            finalBuffer = await sharp(imageBuffer)
                .resize(newWidth)
                .jpeg({ quality: 80 })
                .toBuffer();
        } else {
            finalBuffer = await sharp(imageBuffer)
                .jpeg({ quality: 85 })
                .toBuffer();
        }

        const base64 = finalBuffer.toString('base64');
        const svg = wrapSvg(base64, 'image/jpeg');
        totalSize += base64.length;

        if (cardName === '__BACK__') {
            cardBackSvg = svg;
            console.log(`  ${fileKey} → Card Back`);
        } else {
            cards[cardName] = svg;
            count++;
            process.stdout.write(`\r  Processing: ${count}/78 - ${cardName}                    `);
        }
    }
    console.log('');

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
    console.log(`\nDone! ${count} cards → deck.json (${fileMB} MB)`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
