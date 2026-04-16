#!/usr/bin/env node
/**
 * Prepare a bitmap-based tarot deck from SVGs with embedded base64 images.
 *
 * Usage:
 *   node scripts/prepare-deck.mjs <source-dir> <deck-id> [--scale 0.5] [--back path/to/back.svg]
 *
 * Example:
 *   node scripts/prepare-deck.mjs "temp/78 Tarot Cards (Community)" community --scale 0.5
 *
 * Expects source-dir to contain subfolders:
 *   - *major arcana/   (22 SVGs)
 *   - *cups/           (14 SVGs)
 *   - *swords/         (14 SVGs)
 *   - *pentacles/      (14 SVGs)
 *   - *wands/          (14 SVGs)
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, existsSync } from 'fs';
import { join, basename, resolve } from 'path';

// ── Major Arcana mapping: filename (no ext) → card name ──
const MAJOR_ARCANA_MAP = {
    '0':  'The Fool',
    '1':  'The Magician',
    '2':  'The High Priestess',
    '4':  'The Emperor',
    '5':  'The Hierophant',
    '23': 'The Empress',
    '24': 'The Lovers',
    '25': 'The Chariot',
    '26': 'Strength',
    '27': 'The Hermit',
    '28': 'Wheel of Fortune',
    '29': 'Justice',
    '30': 'The Hanged Man',
    '31': 'Death',
    '32': 'Temperance',
    '33': 'The Devil',
    '34': 'The Tower',
    '35': 'The Star',
    '36': 'The Moon',
    '37': 'The Sun',
    '38': 'Judgement',
    '39': 'The World',
};

// ── Minor Arcana rank mapping ──
const RANK_MAP = {
    '1':      'Ace',
    '2':      'Two',
    '3':      'Three',
    '4':      'Four',
    '5':      'Five',
    '6':      'Six',
    '7':      'Seven',
    '8':      'Eight',
    '9':      'Nine',
    '10':     'Ten',
    'Page':   'Page',
    'Knight': 'Knight',
    'Queen':  'Queen',
    'King':   'King',
};

function toFilename(cardName) {
    return cardName.toLowerCase().replace(/ /g, '-') + '.svg';
}

function findSubdir(parentDir, keyword) {
    const entries = readdirSync(parentDir, { withFileTypes: true });
    const kw = keyword.toLowerCase();
    // Match directory name containing the keyword (handles prefixed folder names)
    const match = entries.find(e => e.isDirectory() && e.name.toLowerCase().includes(kw));
    if (!match) throw new Error(`No subdirectory matching "${keyword}" in ${parentDir}`);
    return join(parentDir, match.name);
}

/**
 * Resize the embedded base64 image in an SVG by the given scale factor.
 * Uses pure JS — decodes PNG/JPEG, scales the SVG viewBox and image dimensions.
 * For actual pixel-level resize we need sharp, but we can do a simpler approach:
 * just scale the SVG viewBox so the browser renders it smaller.
 */
function resizeSvg(svgContent, scale) {
    if (scale >= 1.0) return svgContent;

    // Strategy: reduce the width/height attributes and let the embedded image
    // scale down naturally via the SVG viewBox. The base64 data stays the same
    // but the SVG declares smaller dimensions, so browsers render at lower res.
    //
    // For actual file-size reduction, we'd need to decode and re-encode the
    // base64 bitmap. Let's try with sharp if available, otherwise just adjust SVG dims.

    // Extract original dimensions from SVG tag
    const widthMatch = svgContent.match(/width="(\d+)"/);
    const heightMatch = svgContent.match(/height="(\d+)"/);

    if (!widthMatch || !heightMatch) return svgContent;

    const origW = parseInt(widthMatch[1]);
    const origH = parseInt(heightMatch[1]);
    const newW = Math.round(origW * scale);
    const newH = Math.round(origH * scale);

    // Replace width/height in SVG tag (first occurrence)
    let result = svgContent.replace(
        /(<svg[^>]*?)width="(\d+)"([^>]*?)height="(\d+)"/,
        `$1width="${newW}"$3height="${newH}"`
    );

    return result;
}

/**
 * If sharp is available, actually resize the embedded bitmap for real file-size savings.
 */
async function resizeSvgWithSharp(svgContent, scale) {
    // Extract base64 image data
    const b64Match = svgContent.match(/(?:xlink:)?href="data:image\/(png|jpeg|jpg);base64,([^"]+)"/);
    if (!b64Match) {
        console.warn('  No embedded base64 image found, skipping');
        return svgContent;
    }

    const base64Data = b64Match[2];
    const imageBuffer = Buffer.from(base64Data, 'base64');

    let sharp;
    try {
        sharp = (await import('sharp')).default;
    } catch {
        console.warn('  sharp not available, keeping original');
        return svgContent;
    }

    const metadata = await sharp(imageBuffer).metadata();
    let finalBase64;
    let newW, newH;

    if (scale < 1.0) {
        const newWidth = Math.round(metadata.width * scale);
        const resizedBuffer = await sharp(imageBuffer)
            .resize(newWidth)
            .jpeg({ quality: 80 })
            .toBuffer();
        finalBase64 = resizedBuffer.toString('base64');
        const resizedMeta = await sharp(resizedBuffer).metadata();
        newW = resizedMeta.width;
        newH = resizedMeta.height;
        const savings = ((imageBuffer.length - resizedBuffer.length) / imageBuffer.length * 100).toFixed(1);
        console.log(`  Resized: ${metadata.width}→${newW}px, ${savings}% smaller`);
    } else {
        // Keep original image but convert to JPEG for consistency
        finalBase64 = base64Data;
        newW = metadata.width;
        newH = metadata.height;
        console.log(`  Kept original: ${newW}x${newH}`);
    }

    // Build a simple SVG that stretches the image to fill any container
    const result = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="none">` +
        `<image width="100%" height="100%" preserveAspectRatio="none" ` +
        `href="data:image/jpeg;base64,${finalBase64}"/>` +
        `</svg>`;

    return result;
}

// ── Main ──
async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node scripts/prepare-deck.mjs <source-dir> <deck-id> [--scale N] [--back path] [--label "Name"] [--desc "Description"]');
        process.exit(1);
    }

    const sourceDir = resolve(args[0]);
    const deckId = args[1];
    let scale = 0.5;
    let backPath = null;
    let label = deckId.charAt(0).toUpperCase() + deckId.slice(1);
    let description = `${label} tarot deck`;

    // Parse optional flags
    for (let i = 2; i < args.length; i++) {
        if (args[i] === '--scale' && args[i + 1]) { scale = parseFloat(args[++i]); }
        if (args[i] === '--back' && args[i + 1]) { backPath = resolve(args[++i]); }
        if (args[i] === '--label' && args[i + 1]) { label = args[++i]; }
        if (args[i] === '--desc' && args[i + 1]) { description = args[++i]; }
    }

    const outDir = resolve(`client/public/decks/${deckId}`);
    mkdirSync(outDir, { recursive: true });

    console.log(`Preparing deck "${label}" (${deckId})`);
    console.log(`  Source: ${sourceDir}`);
    console.log(`  Output: ${outDir}`);
    console.log(`  Scale:  ${scale}`);

    const cards = {};
    let totalOrigSize = 0;
    let totalNewSize = 0;

    // ── Process Major Arcana ──
    const majorDir = findSubdir(sourceDir, 'major arcana');
    console.log(`\nMajor Arcana (${majorDir}):`);

    for (const [fileNum, cardName] of Object.entries(MAJOR_ARCANA_MAP)) {
        const srcFile = join(majorDir, `${fileNum}.svg`);
        if (!existsSync(srcFile)) {
            console.warn(`  MISSING: ${srcFile}`);
            continue;
        }
        const origContent = readFileSync(srcFile, 'utf8');
        totalOrigSize += origContent.length;

        const resized = await resizeSvgWithSharp(origContent, scale);
        totalNewSize += resized.length;

        cards[cardName] = resized;
        console.log(`  ${fileNum}.svg → ${cardName}`);
    }

    // ── Process Minor Arcana ──
    const suits = ['cups', 'swords', 'pentacles', 'wands'];
    const suitNames = { cups: 'Cups', swords: 'Swords', pentacles: 'Pentacles', wands: 'Wands' };

    for (const suit of suits) {
        const suitDir = findSubdir(sourceDir, suit);
        const suitName = suitNames[suit];
        console.log(`\n${suitName} (${suitDir}):`);

        for (const [fileKey, rank] of Object.entries(RANK_MAP)) {
            const srcFile = join(suitDir, `${fileKey}.svg`);
            if (!existsSync(srcFile)) {
                console.warn(`  MISSING: ${srcFile}`);
                continue;
            }
            const origContent = readFileSync(srcFile, 'utf8');
            totalOrigSize += origContent.length;

            const cardName = `${rank} of ${suitName}`;
            const resized = await resizeSvgWithSharp(origContent, scale);
            totalNewSize += resized.length;

            cards[cardName] = resized;
            console.log(`  ${fileKey}.svg → ${cardName}`);
        }
    }

    // ── Card Back ──
    let cardBackSvg = null;
    if (backPath && existsSync(backPath)) {
        const backContent = readFileSync(backPath, 'utf8');
        cardBackSvg = await resizeSvgWithSharp(backContent, scale);
        console.log(`\nCard back: ${backPath}`);
    }

    // ── Write single deck.json with all SVGs inline ──
    const manifest = {
        id: deckId,
        label,
        description,
        ...(cardBackSvg ? { cardBack: cardBackSvg } : {}),
        cards,
    };

    writeFileSync(join(outDir, 'deck.json'), JSON.stringify(manifest));

    const cardCount = Object.keys(cards).length;
    const origMB = (totalOrigSize / 1024 / 1024).toFixed(1);
    const newMB = (totalNewSize / 1024 / 1024).toFixed(1);
    const fileMB = (Buffer.byteLength(JSON.stringify(manifest)) / 1024 / 1024).toFixed(1);
    console.log(`\nDone! ${cardCount} cards → single deck.json (${fileMB} MB)`);
    console.log(`  Original: ${origMB} MB → Resized: ${newMB} MB`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
