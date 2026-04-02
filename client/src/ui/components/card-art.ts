/**
 * Tarot card SVG artwork — converted from legacy index.html
 * All functions return SVG markup strings for the given dimensions.
 */

// ══════════════════════════════════════════════════════════
// SUIT CONFIGURATION
// ══════════════════════════════════════════════════════════

const SUIT_CONFIG: Record<string, { color: string; colorDim: string; element: string; elemName: string; bgGrad: [string, string] }> = {
    Wands:     { color: '#e85830', colorDim: '#a03018', element: '🔥', elemName: 'Fire', bgGrad: ['#2a1008', '#180408'] },
    Cups:      { color: '#4090d0', colorDim: '#285880', element: '💧', elemName: 'Water', bgGrad: ['#081828', '#040818'] },
    Swords:    { color: '#c0c8d8', colorDim: '#707888', element: '💨', elemName: 'Air', bgGrad: ['#181820', '#0c0c14'] },
    Pentacles: { color: '#d0a830', colorDim: '#887020', element: '🌍', elemName: 'Earth', bgGrad: ['#1a1808', '#100c04'] },
};

// ══════════════════════════════════════════════════════════
// CARD BACK SVG
// ══════════════════════════════════════════════════════════

export function cardBackSvg(w: number, h: number): string {
    let diamonds = '';
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 10; j++) {
            const x = i * (w / 5) + w / 10;
            const y = j * (h / 9) + h / 18;
            diamonds += `<polygon points="${x},${y - 8} ${x + 6},${y} ${x},${y + 8} ${x - 6},${y}" fill="none" stroke="rgba(200,168,75,0.15)" stroke-width="0.5"/>`;
        }
    }
    // EXTRA: Second offset diamond grid for doubled detail
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 9; j++) {
            const x = i * (w / 5) + w / 5;
            const y = j * (h / 9) + h / 9;
            diamonds += `<polygon points="${x},${y - 5} ${x + 4},${y} ${x},${y + 5} ${x - 4},${y}" fill="none" stroke="rgba(200,168,75,0.08)" stroke-width="0.3"/>`;
        }
    }
    const cx = w / 2, cy = h / 2;
    return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`
        + `<rect width="${w}" height="${h}" fill="#100820"/>`
        + `<rect x="8" y="8" width="${w - 16}" height="${h - 16}" fill="none" stroke="rgba(200,168,75,0.4)" stroke-width="0.8" rx="5"/>`
        + `<rect x="14" y="14" width="${w - 28}" height="${h - 28}" fill="none" stroke="rgba(200,168,75,0.2)" stroke-width="0.6" rx="3"/>`
        + diamonds
        + `<circle cx="${cx}" cy="${cy}" r="35" fill="none" stroke="rgba(200,168,75,0.15)" stroke-width="0.5"/>`
        + `<circle cx="${cx}" cy="${cy}" r="28" fill="none" stroke="rgba(200,168,75,0.35)" stroke-width="0.8"/>`
        + `<circle cx="${cx}" cy="${cy}" r="20" fill="rgba(200,168,75,0.06)" stroke="rgba(200,168,75,0.25)" stroke-width="0.6"/>`
        + `<circle cx="${cx}" cy="${cy}" r="15" fill="none" stroke="rgba(200,168,75,0.12)" stroke-width="0.4"/>`
        + `<circle cx="${cx}" cy="${cy}" r="10" fill="rgba(200,168,75,0.1)" stroke="rgba(200,168,75,0.4)" stroke-width="0.8"/>`
        + `<circle cx="${cx}" cy="${cy}" r="3" fill="rgba(200,168,75,0.6)"/>`
        + `<line x1="${cx}" y1="${cy - 30}" x2="${cx}" y2="${cy + 30}" stroke="rgba(200,168,75,0.2)" stroke-width="0.5"/>`
        + `<line x1="${cx - 30}" y1="${cy}" x2="${cx + 30}" y2="${cy}" stroke="rgba(200,168,75,0.2)" stroke-width="0.5"/>`
        // EXTRA: Diagonal cross lines
        + `<line x1="${cx - 22}" y1="${cy - 22}" x2="${cx + 22}" y2="${cy + 22}" stroke="rgba(200,168,75,0.1)" stroke-width="0.4"/>`
        + `<line x1="${cx + 22}" y1="${cy - 22}" x2="${cx - 22}" y2="${cy + 22}" stroke="rgba(200,168,75,0.1)" stroke-width="0.4"/>`
        // EXTRA: Corner ornaments
        + `<polygon points="22,22 28,16 34,22 28,28" fill="none" stroke="rgba(200,168,75,0.25)" stroke-width="0.5"/>`
        + `<polygon points="${w - 22},22 ${w - 28},16 ${w - 34},22 ${w - 28},28" fill="none" stroke="rgba(200,168,75,0.25)" stroke-width="0.5"/>`
        + `<polygon points="22,${h - 22} 28,${h - 28} 34,${h - 22} 28,${h - 16}" fill="none" stroke="rgba(200,168,75,0.25)" stroke-width="0.5"/>`
        + `<polygon points="${w - 22},${h - 22} ${w - 28},${h - 28} ${w - 34},${h - 22} ${w - 28},${h - 16}" fill="none" stroke="rgba(200,168,75,0.25)" stroke-width="0.5"/>`
        + `<text x="${cx}" y="30" font-family="serif" font-size="11" fill="rgba(200,168,75,0.5)" text-anchor="middle" letter-spacing="3">TAROT</text>`
        + `<text x="${cx}" y="${h - 16}" font-family="serif" font-size="11" fill="rgba(200,168,75,0.5)" text-anchor="middle" letter-spacing="3">ORACLE</text>`
        + `</svg>`;
}

// ══════════════════════════════════════════════════════════
// SVG BASE — common card frame
// ══════════════════════════════════════════════════════════

function svgBase(w: number, h: number, content: string, numText: string, nameText: string): string {
    const stars = `<circle cx="${w * 0.09}" cy="${h * 0.07}" r="0.8" fill="#fff" opacity="0.55"/>`
        + `<circle cx="${w * 0.91}" cy="${h * 0.05}" r="1.1" fill="#fff" opacity="0.7"/>`
        + `<circle cx="${w * 0.76}" cy="${h * 0.19}" r="0.9" fill="#c9a84c" opacity="0.65"/>`
        + `<circle cx="${w * 0.18}" cy="${h * 0.14}" r="0.7" fill="#fff" opacity="0.45"/>`
        + `<circle cx="${w * 0.85}" cy="${h * 0.32}" r="0.6" fill="#fff" opacity="0.35"/>`
        + `<circle cx="${w * 0.06}" cy="${h * 0.38}" r="0.5" fill="#c9a84c" opacity="0.4"/>`
        // EXTRA: 6 more stars for doubled detail
        + `<circle cx="${w * 0.14}" cy="${h * 0.22}" r="0.6" fill="#fff" opacity="0.3"/>`
        + `<circle cx="${w * 0.88}" cy="${h * 0.15}" r="0.5" fill="#c9a84c" opacity="0.35"/>`
        + `<circle cx="${w * 0.72}" cy="${h * 0.08}" r="0.7" fill="#fff" opacity="0.25"/>`
        + `<circle cx="${w * 0.04}" cy="${h * 0.28}" r="0.4" fill="#fff" opacity="0.2"/>`
        + `<circle cx="${w * 0.95}" cy="${h * 0.25}" r="0.5" fill="#c9a84c" opacity="0.3"/>`
        + `<circle cx="${w * 0.82}" cy="${h * 0.42}" r="0.4" fill="#fff" opacity="0.2"/>`;

    const borders = `<rect x="5" y="5" width="${w - 10}" height="${h - 10}" fill="none" stroke="rgba(200,168,75,0.35)" stroke-width="1" rx="7"/>`
        + `<rect x="9" y="9" width="${w - 18}" height="${h - 18}" fill="none" stroke="rgba(200,168,75,0.15)" stroke-width="0.5" rx="4"/>`;

    // EXTRA: Corner rosettes
    const rosettes = `<circle cx="14" cy="14" r="2" fill="none" stroke="rgba(200,168,75,0.2)" stroke-width="0.4"/>`
        + `<circle cx="${w - 14}" cy="14" r="2" fill="none" stroke="rgba(200,168,75,0.2)" stroke-width="0.4"/>`
        + `<circle cx="14" cy="${h - 14}" r="2" fill="none" stroke="rgba(200,168,75,0.2)" stroke-width="0.4"/>`
        + `<circle cx="${w - 14}" cy="${h - 14}" r="2" fill="none" stroke="rgba(200,168,75,0.2)" stroke-width="0.4"/>`;

    const numLabel = `<text x="${w / 2}" y="22" font-family="serif" font-size="${w * 0.09}" fill="#000" text-anchor="middle" opacity="0.6" dx="0.5" dy="0.5">${numText}</text>`
        + `<text x="${w / 2}" y="22" font-family="serif" font-size="${w * 0.09}" fill="#e0c060" text-anchor="middle" opacity="0.95">${numText}</text>`;

    const nameBar = `<rect x="0" y="${h - 28}" width="${w}" height="28" fill="rgba(0,0,0,0.7)"/>`
        + `<text x="${w / 2}" y="${h - 10}" font-family="serif" font-size="${w * 0.072}" fill="#f5d050" text-anchor="middle" font-weight="bold" letter-spacing="1">${nameText.toUpperCase()}</text>`;

    const defs = `<defs><radialGradient id="bg_${numText}" cx="50%" cy="35%">`
        + `<stop offset="0%" stop-color="#1c0c38"/>`
        + `<stop offset="100%" stop-color="#050210"/>`
        + `</radialGradient></defs>`;

    return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`
        + defs
        + `<rect width="${w}" height="${h}" fill="url(#bg_${numText})"/>`
        + content + stars + borders + rosettes + numLabel + nameBar
        + `</svg>`;
}

// ══════════════════════════════════════════════════════════
// MAJOR ARCANA — 22 cards
// ══════════════════════════════════════════════════════════

function drawFool(w: number, h: number): string {
    const c = ` <path d="M0,${h * 0.68} Q${w * 0.28},${h * 0.55} ${w * 0.52},${h * 0.62} L${w * 0.58},${h} L0,${h}Z" fill="#0d1f0a" opacity="0.95"/>`
        + ` <circle cx="${w * 0.72}" cy="${h * 0.15}" r="${w * 0.15}" fill="#fff8d0" opacity="0.18"/>`
        + ` <circle cx="${w * 0.72}" cy="${h * 0.15}" r="${w * 0.1}" fill="#ffe8a0" opacity="0.3"/>`
        + ` <path d="M0,${h * 0.55} L${w * 0.18},${h * 0.35} L${w * 0.32},${h * 0.5} L${w * 0.48},${h * 0.28} L${w * 0.62},${h * 0.46} L${w * 0.78},${h * 0.3} L${w},${h * 0.48} L${w},${h * 0.7} L0,${h * 0.7}Z" fill="#1a2035" opacity="0.9"/>`
        + ` <polygon points="${w * 0.48},${h * 0.28} ${w * 0.44},${h * 0.36} ${w * 0.52},${h * 0.36}" fill="#d8e0f0" opacity="0.4"/>`
        + ` <line x1="${w * 0.1}" y1="${h * 0.7}" x2="${w * 0.08}" y2="${h * 0.62}" stroke="#2a4010" stroke-width="1.5"/>`
        + ` <line x1="${w * 0.22}" y1="${h * 0.69}" x2="${w * 0.2}" y2="${h * 0.62}" stroke="#2a4010" stroke-width="1.5"/>`
        + ` <ellipse cx="${w * 0.3}" cy="${h * 0.66}" rx="${w * 0.1}" ry="${w * 0.065}" fill="#b09070" opacity="0.95"/>`
        + ` <circle cx="${w * 0.38}" cy="${h * 0.61}" r="${w * 0.05}" fill="#b09070"/>`
        + ` <circle cx="${w * 0.405}" cy="${h * 0.595}" r="${w * 0.018}" fill="#1a1008"/>`
        + ` <path d="M${w * 0.37},${h * 0.645} Q${w * 0.34},${h * 0.68} ${w * 0.32},${h * 0.67}" fill="none" stroke="#c06040" stroke-width="1.2"/>`
        + ` <line x1="${w * 0.22}" y1="${h * 0.69}" x2="${w * 0.18}" y2="${h * 0.58}" stroke="#b09070" stroke-width="2.5" stroke-linecap="round"/>`
        + ` <ellipse cx="${w * 0.54}" cy="${h * 0.5}" rx="${w * 0.07}" ry="${w * 0.085}" fill="#f0c890"/>`
        + ` <circle cx="${w * 0.56}" cy="${h * 0.48}" r="${w * 0.018}" fill="#3a2010"/>`
        + ` <path d="M${w * 0.51},${h * 0.52} Q${w * 0.54},${h * 0.54} ${w * 0.57},${h * 0.52}" fill="none" stroke="#c07060" stroke-width="1"/>`
        + ` <path d="M${w * 0.46},${h * 0.57} L${w * 0.5},${h * 0.7} L${w * 0.62},${h * 0.7} L${w * 0.62},${h * 0.57}Z" fill="#c84040" opacity="0.9"/>`
        + ` <rect x="${w * 0.46}" y="${h * 0.565}" width="${w * 0.16}" height="${h * 0.03}" fill="#e8a020" opacity="0.9"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.7}" x2="${w * 0.48}" y2="${h * 0.83}" stroke="#4a3020" stroke-width="4" stroke-linecap="round"/>`
        + ` <line x1="${w * 0.58}" y1="${h * 0.7}" x2="${w * 0.62}" y2="${h * 0.83}" stroke="#4a3020" stroke-width="4" stroke-linecap="round"/>`
        + ` <line x1="${w * 0.68}" y1="${h * 0.38}" x2="${w * 0.6}" y2="${h * 0.72}" stroke="#8a6820" stroke-width="2.5"/>`
        + ` <ellipse cx="${w * 0.69}" cy="${h * 0.37}" rx="${w * 0.055}" ry="${w * 0.045}" fill="#8b5513" opacity="0.9"/>`
        + ` <line x1="${w * 0.48}" y1="${h * 0.57}" x2="${w * 0.42}" y2="${h * 0.52}" stroke="#f0c890" stroke-width="2.5"/>`
        + ` <line x1="${w * 0.42}" y1="${h * 0.52}" x2="${w * 0.38}" y2="${h * 0.44}" stroke="#4a8020" stroke-width="1.5"/>`
        + ` <circle cx="${w * 0.38}" cy="${h * 0.42}" r="${w * 0.03}" fill="#ff80a0"/>`
        + ` <circle cx="${w * 0.38}" cy="${h * 0.42}" r="${w * 0.015}" fill="#ffee80"/>`
        // EXTRA: wind lines, grass tufts, extra stars
        + ` <path d="M${w * 0.62},${h * 0.42} Q${w * 0.72},${h * 0.4} ${w * 0.82},${h * 0.42}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.6"/>`
        + ` <path d="M${w * 0.65},${h * 0.45} Q${w * 0.75},${h * 0.43} ${w * 0.85},${h * 0.46}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>`
        + ` <line x1="${w * 0.05}" y1="${h * 0.69}" x2="${w * 0.04}" y2="${h * 0.65}" stroke="#2a4010" stroke-width="1"/>`
        + ` <line x1="${w * 0.15}" y1="${h * 0.695}" x2="${w * 0.14}" y2="${h * 0.66}" stroke="#2a4010" stroke-width="1"/>`
        + ` <circle cx="${w * 0.88}" cy="${h * 0.12}" r="1" fill="#fff" opacity="0.5"/>`;
    return svgBase(w, h, c, '0', 'THE FOOL');
}

function drawMagician(w: number, h: number): string {
    const c = ` <path d="M0,${h * 0.65} L${w},${h * 0.65} L${w},${h} L0,${h}Z" fill="#0a1f08" opacity="0.8"/>`
        + ` <line x1="${w * 0.1}" y1="${h * 0.65}" x2="${w * 0.08}" y2="${h * 0.5}" stroke="#2a5010" stroke-width="2"/>`
        + ` <circle cx="${w * 0.08}" cy="${h * 0.48}" r="${w * 0.03}" fill="#c02040"/>`
        + ` <line x1="${w * 0.88}" y1="${h * 0.65}" x2="${w * 0.9}" y2="${h * 0.5}" stroke="#2a5010" stroke-width="2"/>`
        + ` <circle cx="${w * 0.9}" cy="${h * 0.48}" r="${w * 0.03}" fill="#c02040"/>`
        + ` <rect x="${w * 0.12}" y="${h * 0.52}" width="${w * 0.76}" height="${h * 0.07}" rx="4" fill="#2a1008" stroke="#c9a84c" stroke-width="1"/>`
        + ` <path d="M${w * 0.12},${h * 0.59} Q${w * 0.5},${h * 0.65} ${w * 0.88},${h * 0.59} L${w * 0.88},${h * 0.63} Q${w * 0.5},${h * 0.68} ${w * 0.12},${h * 0.63}Z" fill="#601080" opacity="0.5"/>`
        + ` <circle cx="${w * 0.24}" cy="${h * 0.49}" r="${w * 0.04}" fill="none" stroke="#c9a84c" stroke-width="1.8"/>`
        + ` <rect x="${w * 0.22}" y="${h * 0.49}" width="${w * 0.04}" height="${h * 0.03}" fill="none" stroke="#c9a84c" stroke-width="0.8"/>`
        + ` <polygon points="${w * 0.39},${h * 0.46} ${w * 0.43},${h * 0.52} ${w * 0.35},${h * 0.52}" fill="#c9a84c"/>`
        + ` <line x1="${w * 0.57}" y1="${h * 0.44}" x2="${w * 0.57}" y2="${h * 0.52}" stroke="#d0d0e0" stroke-width="2.5"/>`
        + ` <line x1="${w * 0.54}" y1="${h * 0.48}" x2="${w * 0.6}" y2="${h * 0.48}" stroke="#d0d0e0" stroke-width="1.5"/>`
        + ` <rect x="${w * 0.7}" y="${h * 0.47}" width="${w * 0.08}" height="${h * 0.05}" rx="2" fill="#a06020" opacity="0.9"/>`
        + ` <circle cx="${w * 0.74}" cy="${h * 0.46}" r="${w * 0.02}" fill="#ff8040"/>`
        + ` <path d="M${w * 0.36},${h * 0.38} L${w * 0.28},${h * 0.52} L${w * 0.72},${h * 0.52} L${w * 0.64},${h * 0.38}Z" fill="#c04040" opacity="0.85"/>`
        + ` <ellipse cx="${w * 0.5}" cy="${h * 0.3}" rx="${w * 0.09}" ry="${w * 0.1}" fill="#f0c890"/>`
        + ` <ellipse cx="${w * 0.5}" cy="${h * 0.21}" rx="${w * 0.14}" ry="${h * 0.022}" fill="#101010"/>`
        + ` <rect x="${w * 0.44}" y="${h * 0.1}" width="${w * 0.12}" height="${h * 0.12}" rx="2" fill="#101010"/>`
        + ` <circle cx="${w * 0.46}" cy="${h * 0.29}" r="${w * 0.018}" fill="#3a2010"/>`
        + ` <circle cx="${w * 0.54}" cy="${h * 0.29}" r="${w * 0.018}" fill="#3a2010"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.1}" x2="${w * 0.5}" y2="${h * 0.38}" stroke="#8a6820" stroke-width="2.5"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.08}" r="${w * 0.025}" fill="#ffe040"/>`
        + ` <path d="M${w * 0.35},${h * 0.08} Q${w * 0.4},${h * 0.04} ${w * 0.5},${h * 0.08} Q${w * 0.6},${h * 0.12} ${w * 0.65},${h * 0.08} Q${w * 0.6},${h * 0.04} ${w * 0.5},${h * 0.08} Q${w * 0.4},${h * 0.12} ${w * 0.35},${h * 0.08}" fill="none" stroke="#c9a84c" stroke-width="1.5"/>`
        + ` <line x1="${w * 0.38}" y1="${h * 0.42}" x2="${w * 0.26}" y2="${h * 0.52}" stroke="#f0c890" stroke-width="3" stroke-linecap="round"/>`
        // EXTRA: sparkles around wand tip, extra table ornaments, rune marks
        + ` <circle cx="${w * 0.48}" cy="${h * 0.06}" r="1.2" fill="#ffe040" opacity="0.6"/>`
        + ` <circle cx="${w * 0.53}" cy="${h * 0.05}" r="0.8" fill="#fff" opacity="0.5"/>`
        + ` <circle cx="${w * 0.46}" cy="${h * 0.04}" r="0.9" fill="#ffe040" opacity="0.4"/>`
        + ` <line x1="${w * 0.3}" y1="${h * 0.54}" x2="${w * 0.3}" y2="${h * 0.56}" stroke="#c9a84c" stroke-width="0.5" opacity="0.4"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.54}" x2="${w * 0.5}" y2="${h * 0.56}" stroke="#c9a84c" stroke-width="0.5" opacity="0.4"/>`;
    return svgBase(w, h, c, 'I', 'THE MAGICIAN');
}

function drawHighPriestess(w: number, h: number): string {
    const c = ` <path d="M${w * 0.22},${h * 0.58} Q${w * 0.5},${h * 0.53} ${w * 0.78},${h * 0.58} L${w * 0.8},${h * 0.93} Q${w * 0.5},${h * 0.87} ${w * 0.2},${h * 0.93}Z" fill="#0a0420" stroke="#c9a84c" stroke-width="0.5" opacity="0.85"/>`
        + ` <circle cx="${w * 0.32}" cy="${h * 0.72}" r="${w * 0.04}" fill="#8b1a2a" opacity="0.7"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.7}" r="${w * 0.04}" fill="#8b1a2a" opacity="0.7"/>`
        + ` <circle cx="${w * 0.68}" cy="${h * 0.72}" r="${w * 0.04}" fill="#8b1a2a" opacity="0.7"/>`
        + ` <circle cx="${w * 0.41}" cy="${h * 0.78}" r="${w * 0.032}" fill="#8b1a2a" opacity="0.6"/>`
        + ` <circle cx="${w * 0.59}" cy="${h * 0.78}" r="${w * 0.032}" fill="#8b1a2a" opacity="0.6"/>`
        + ` <rect x="${w * 0.08}" y="${h * 0.2}" width="${w * 0.16}" height="${h * 0.55}" rx="3" fill="#1a0840" stroke="#c9a84c" stroke-width="1"/>`
        + ` <rect x="${w * 0.76}" y="${h * 0.2}" width="${w * 0.16}" height="${h * 0.55}" rx="3" fill="#0d0820" stroke="#c9a84c" stroke-width="1"/>`
        + ` <rect x="${w * 0.06}" y="${h * 0.19}" width="${w * 0.2}" height="${h * 0.024}" rx="2" fill="#c9a84c" opacity="0.6"/>`
        + ` <rect x="${w * 0.74}" y="${h * 0.19}" width="${w * 0.2}" height="${h * 0.024}" rx="2" fill="#c9a84c" opacity="0.6"/>`
        + ` <text x="${w * 0.16}" y="${h * 0.31}" font-family="serif" font-size="${w * 0.11}" fill="#c9a84c" text-anchor="middle" opacity="0.9">B</text>`
        + ` <text x="${w * 0.84}" y="${h * 0.31}" font-family="serif" font-size="${w * 0.11}" fill="#c9a84c" text-anchor="middle" opacity="0.9">J</text>`
        + ` <ellipse cx="${w * 0.5}" cy="${h * 0.19}" rx="${w * 0.15}" ry="${h * 0.034}" fill="#c9a84c" opacity="0.8"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.175}" r="${w * 0.045}" fill="#f0e8c0" opacity="0.9"/>`
        + ` <path d="M${w * 0.36},${h * 0.19} Q${w * 0.39},${h * 0.135} ${w * 0.43},${h * 0.19}" fill="none" stroke="#c9a84c" stroke-width="1.5"/>`
        + ` <path d="M${w * 0.57},${h * 0.19} Q${w * 0.61},${h * 0.135} ${w * 0.64},${h * 0.19}" fill="none" stroke="#c9a84c" stroke-width="1.5"/>`
        + ` <ellipse cx="${w * 0.5}" cy="${h * 0.55}" rx="${w * 0.22}" ry="${h * 0.22}" fill="#13094f" opacity="0.95"/>`
        + ` <ellipse cx="${w * 0.5}" cy="${h * 0.34}" rx="${w * 0.1}" ry="${w * 0.11}" fill="#f0c890"/>`
        + ` <path d="M${w * 0.3},${h * 0.43} Q${w * 0.18},${h * 0.58} ${w * 0.22},${h * 0.78} L${w * 0.34},${h * 0.76} Q${w * 0.28},${h * 0.62} ${w * 0.36},${h * 0.45}Z" fill="#1a2fa0" opacity="0.4"/>`
        + ` <path d="M${w * 0.7},${h * 0.43} Q${w * 0.82},${h * 0.58} ${w * 0.78},${h * 0.78} L${w * 0.66},${h * 0.76} Q${w * 0.72},${h * 0.62} ${w * 0.64},${h * 0.45}Z" fill="#1a2fa0" opacity="0.4"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.46}" x2="${w * 0.5}" y2="${h * 0.59}" stroke="#c9a84c" stroke-width="1.5"/>`
        + ` <line x1="${w * 0.44}" y1="${h * 0.52}" x2="${w * 0.56}" y2="${h * 0.52}" stroke="#c9a84c" stroke-width="1.5"/>`
        + ` <rect x="${w * 0.4}" y="${h * 0.46}" width="${w * 0.2}" height="${h * 0.22}" rx="3" fill="#e8d5a0" stroke="#8a6820" stroke-width="0.8"/>`
        + ` <text x="${w * 0.5}" y="${h * 0.56}" font-family="serif" font-size="${w * 0.08}" fill="#5a3810" text-anchor="middle">TORA</text>`
        + ` <ellipse cx="${w * 0.46}" cy="${h * 0.34}" rx="${w * 0.025}" ry="${w * 0.016}" fill="#fff"/>`
        + ` <ellipse cx="${w * 0.54}" cy="${h * 0.34}" rx="${w * 0.025}" ry="${w * 0.016}" fill="#fff"/>`
        + ` <circle cx="${w * 0.46}" cy="${h * 0.34}" r="${w * 0.014}" fill="#1a0840"/>`
        + ` <circle cx="${w * 0.54}" cy="${h * 0.34}" r="${w * 0.014}" fill="#1a0840"/>`
        + ` <path d="M${w * 0.45},${h * 0.38} Q${w * 0.5},${h * 0.4} ${w * 0.55},${h * 0.38}" fill="none" stroke="#c07070" stroke-width="1"/>`
        // EXTRA: veil texture, moon phases, extra pomegranates
        + ` <path d="M${w * 0.24},${h * 0.6} Q${w * 0.26},${h * 0.62} ${w * 0.24},${h * 0.64}" fill="none" stroke="rgba(200,168,75,0.1)" stroke-width="0.4"/>`
        + ` <path d="M${w * 0.76},${h * 0.6} Q${w * 0.74},${h * 0.62} ${w * 0.76},${h * 0.64}" fill="none" stroke="rgba(200,168,75,0.1)" stroke-width="0.4"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.155}" r="${w * 0.015}" fill="#e0d8b0" opacity="0.5"/>`
        + ` <circle cx="${w * 0.44}" cy="${h * 0.84}" r="${w * 0.025}" fill="#8b1a2a" opacity="0.4"/>`
        + ` <circle cx="${w * 0.56}" cy="${h * 0.85}" r="${w * 0.022}" fill="#8b1a2a" opacity="0.35"/>`;
    return svgBase(w, h, c, 'II', 'HIGH PRIESTESS');
}

function drawEmpress(w: number, h: number): string {
    const c = ` <rect x="0" y="${h * 0.58}" width="${w}" height="${h * 0.42}" fill="#0d2008" opacity="0.9"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.12}" r="${w * 0.22}" fill="#c9a84c" opacity="0.07"/>`
        + ` <path d="M${w * 0.88},${h * 0.35} Q${w * 0.9},${h * 0.5} ${w * 0.86},${h * 0.65}" fill="none" stroke="#6090c0" stroke-width="3" opacity="0.4"/>`
        + ` <line x1="${w * 0.12}" y1="${h * 0.72}" x2="${w * 0.1}" y2="${h * 0.52}" stroke="#6a9030" stroke-width="2"/>`
        + ` <ellipse cx="${w * 0.1}" cy="${h * 0.5}" rx="${w * 0.025}" ry="${h * 0.045}" fill="#c8d860" opacity="0.9"/>`
        + ` <line x1="${w * 0.19}" y1="${h * 0.72}" x2="${w * 0.17}" y2="${h * 0.55}" stroke="#6a9030" stroke-width="2"/>`
        + ` <ellipse cx="${w * 0.17}" cy="${h * 0.53}" rx="${w * 0.022}" ry="${h * 0.04}" fill="#c8d860" opacity="0.9"/>`
        + ` <line x1="${w * 0.82}" y1="${h * 0.72}" x2="${w * 0.84}" y2="${h * 0.55}" stroke="#6a9030" stroke-width="2"/>`
        + ` <ellipse cx="${w * 0.84}" cy="${h * 0.53}" rx="${w * 0.022}" ry="${h * 0.04}" fill="#c8d860" opacity="0.9"/>`
        + ` <line x1="${w * 0.88}" y1="${h * 0.72}" x2="${w * 0.9}" y2="${h * 0.56}" stroke="#6a9030" stroke-width="2"/>`
        + ` <ellipse cx="${w * 0.9}" cy="${h * 0.54}" rx="${w * 0.022}" ry="${h * 0.04}" fill="#c8d860" opacity="0.8"/>`
        + ` <rect x="${w * 0.2}" y="${h * 0.45}" width="${w * 0.6}" height="${h * 0.32}" rx="8" fill="#2a1008" stroke="#c9a84c" stroke-width="1" opacity="0.95"/>`
        + ` <rect x="${w * 0.24}" y="${h * 0.47}" width="${w * 0.52}" height="${h * 0.06}" rx="4" fill="#601030" opacity="0.5"/>`
        + ` <circle cx="${w * 0.24}" cy="${h * 0.6}" r="${w * 0.04}" fill="none" stroke="#c9a84c" stroke-width="1.2"/>`
        + ` <line x1="${w * 0.24}" y1="${h * 0.64}" x2="${w * 0.24}" y2="${h * 0.68}" stroke="#c9a84c" stroke-width="1.2"/>`
        + ` <line x1="${w * 0.21}" y1="${h * 0.66}" x2="${w * 0.27}" y2="${h * 0.66}" stroke="#c9a84c" stroke-width="1.2"/>`
        + ` <ellipse cx="${w * 0.5}" cy="${h * 0.56}" rx="${w * 0.2}" ry="${h * 0.16}" fill="#d06080" opacity="0.9"/>`
        + ` <ellipse cx="${w * 0.5}" cy="${h * 0.3}" rx="${w * 0.1}" ry="${w * 0.11}" fill="#f0c890"/>`
        + ` <rect x="${w * 0.37}" y="${h * 0.19}" width="${w * 0.26}" height="${h * 0.04}" rx="2" fill="#c9a84c"/>`
        + ` <line x1="${w * 0.41}" y1="${h * 0.19}" x2="${w * 0.41}" y2="${h * 0.14}" stroke="#c9a84c" stroke-width="2"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.19}" x2="${w * 0.5}" y2="${h * 0.12}" stroke="#c9a84c" stroke-width="2.5"/>`
        + ` <line x1="${w * 0.59}" y1="${h * 0.19}" x2="${w * 0.59}" y2="${h * 0.14}" stroke="#c9a84c" stroke-width="2"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.115}" r="${w * 0.025}" fill="#ff8040"/>`
        + ` <line x1="${w * 0.68}" y1="${h * 0.26}" x2="${w * 0.72}" y2="${h * 0.52}" stroke="#8a6820" stroke-width="2.5"/>`
        + ` <circle cx="${w * 0.68}" cy="${h * 0.25}" r="${w * 0.025}" fill="#c9a84c"/>`
        + ` <circle cx="${w * 0.42}" cy="${h * 0.54}" r="1.5" fill="#ffe040" opacity="0.6"/>`
        + ` <circle cx="${w * 0.55}" cy="${h * 0.5}" r="1.5" fill="#ffe040" opacity="0.6"/>`
        + ` <circle cx="${w * 0.48}" cy="${h * 0.62}" r="1.5" fill="#ffe040" opacity="0.5"/>`
        // EXTRA: flowers at feet, butterfly, extra vegetation
        + ` <circle cx="${w * 0.15}" cy="${h * 0.76}" r="${w * 0.015}" fill="#ff80a0" opacity="0.6"/>`
        + ` <circle cx="${w * 0.25}" cy="${h * 0.78}" r="${w * 0.012}" fill="#ffcc40" opacity="0.5"/>`
        + ` <circle cx="${w * 0.8}" cy="${h * 0.75}" r="${w * 0.013}" fill="#ff80a0" opacity="0.5"/>`
        + ` <path d="M${w * 0.75},${h * 0.4} Q${w * 0.77},${h * 0.38} ${w * 0.79},${h * 0.4} Q${w * 0.77},${h * 0.42} ${w * 0.75},${h * 0.4}Z" fill="#e0c8ff" opacity="0.4"/>`
        + ` <line x1="${w * 0.06}" y1="${h * 0.72}" x2="${w * 0.05}" y2="${h * 0.66}" stroke="#6a9030" stroke-width="1.2"/>`;
    return svgBase(w, h, c, 'III', 'THE EMPRESS');
}

function drawEmperor(w: number, h: number): string {
    const c = ` <path d="M0,${h * 0.62} L${w * 0.2},${h * 0.38} L${w * 0.38},${h * 0.55} L${w * 0.55},${h * 0.32} L${w * 0.72},${h * 0.5} L${w * 0.88},${h * 0.36} L${w},${h * 0.52} L${w},${h} L0,${h}Z" fill="#3a1510" opacity="0.88"/>`
        + ` <polygon points="${w * 0.55},${h * 0.32} ${w * 0.51},${h * 0.42} ${w * 0.59},${h * 0.42}" fill="#d0c0b0" opacity="0.35"/>`
        + ` <rect x="${w * 0.18}" y="${h * 0.28}" width="${w * 0.64}" height="${h * 0.48}" rx="6" fill="#1a0808" stroke="#c9a84c" stroke-width="1.2" opacity="0.95"/>`
        + ` <circle cx="${w * 0.25}" cy="${h * 0.27}" r="${w * 0.055}" fill="#c9a84c" opacity="0.65"/>`
        + ` <path d="M${w * 0.22},${h * 0.27} Q${w * 0.2},${h * 0.24} ${w * 0.23},${h * 0.22}" fill="none" stroke="#c9a84c" stroke-width="1.5"/>`
        + ` <path d="M${w * 0.28},${h * 0.27} Q${w * 0.3},${h * 0.24} ${w * 0.27},${h * 0.22}" fill="none" stroke="#c9a84c" stroke-width="1.5"/>`
        + ` <circle cx="${w * 0.75}" cy="${h * 0.27}" r="${w * 0.055}" fill="#c9a84c" opacity="0.65"/>`
        + ` <path d="M${w * 0.72},${h * 0.27} Q${w * 0.7},${h * 0.24} ${w * 0.73},${h * 0.22}" fill="none" stroke="#c9a84c" stroke-width="1.5"/>`
        + ` <path d="M${w * 0.78},${h * 0.27} Q${w * 0.8},${h * 0.24} ${w * 0.77},${h * 0.22}" fill="none" stroke="#c9a84c" stroke-width="1.5"/>`
        + ` <ellipse cx="${w * 0.5}" cy="${h * 0.6}" rx="${w * 0.22}" ry="${h * 0.19}" fill="#8b1a2a" opacity="0.95"/>`
        + ` <rect x="${w * 0.38}" y="${h * 0.37}" width="${w * 0.24}" height="${h * 0.22}" rx="4" fill="#909090" opacity="0.9"/>`
        + ` <rect x="${w * 0.36}" y="${h * 0.56}" width="${w * 0.28}" height="${h * 0.03}" rx="2" fill="#c9a84c" opacity="0.8"/>`
        + ` <ellipse cx="${w * 0.5}" cy="${h * 0.31}" rx="${w * 0.09}" ry="${w * 0.1}" fill="#f0c890"/>`
        + ` <path d="M${w * 0.42},${h * 0.36} Q${w * 0.5},${h * 0.44} ${w * 0.58},${h * 0.36}" fill="#a08060" opacity="0.9"/>`
        + ` <path d="M${w * 0.44},${h * 0.38} Q${w * 0.5},${h * 0.46} ${w * 0.56},${h * 0.38} Q${w * 0.5},${h * 0.48} ${w * 0.44},${h * 0.38}" fill="#a08060" opacity="0.4"/>`
        + ` <circle cx="${w * 0.46}" cy="${h * 0.3}" r="${w * 0.016}" fill="#3a2010"/>`
        + ` <circle cx="${w * 0.54}" cy="${h * 0.3}" r="${w * 0.016}" fill="#3a2010"/>`
        + ` <rect x="${w * 0.38}" y="${h * 0.21}" width="${w * 0.24}" height="${h * 0.04}" rx="2" fill="#c9a84c"/>`
        + ` <line x1="${w * 0.42}" y1="${h * 0.21}" x2="${w * 0.4}" y2="${h * 0.15}" stroke="#c9a84c" stroke-width="2.5"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.21}" x2="${w * 0.5}" y2="${h * 0.13}" stroke="#c9a84c" stroke-width="3"/>`
        + ` <line x1="${w * 0.58}" y1="${h * 0.21}" x2="${w * 0.6}" y2="${h * 0.15}" stroke="#c9a84c" stroke-width="2.5"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.12}" r="${w * 0.025}" fill="#ff2020"/>`
        + ` <circle cx="${w * 0.33}" cy="${h * 0.48}" r="${w * 0.045}" fill="#c9a84c" opacity="0.75"/>`
        + ` <circle cx="${w * 0.33}" cy="${h * 0.48}" r="${w * 0.025}" fill="#e0d080"/>`
        + ` <line x1="${w * 0.28}" y1="${h * 0.44}" x2="${w * 0.35}" y2="${h * 0.5}" stroke="#f0c890" stroke-width="2.5"/>`
        + ` <line x1="${w * 0.67}" y1="${h * 0.32}" x2="${w * 0.7}" y2="${h * 0.58}" stroke="#c9a84c" stroke-width="2.5"/>`
        + ` <circle cx="${w * 0.67}" cy="${h * 0.3}" r="${w * 0.03}" fill="none" stroke="#c9a84c" stroke-width="2"/>`
        + ` <line x1="${w * 0.64}" y1="${h * 0.33}" x2="${w * 0.7}" y2="${h * 0.33}" stroke="#c9a84c" stroke-width="1.8"/>`
        // EXTRA: cliff texture, battle scars on throne, extra mountain detail
        + ` <line x1="${w * 0.1}" y1="${h * 0.65}" x2="${w * 0.15}" y2="${h * 0.62}" stroke="#3a1510" stroke-width="0.6" opacity="0.5"/>`
        + ` <line x1="${w * 0.85}" y1="${h * 0.58}" x2="${w * 0.9}" y2="${h * 0.55}" stroke="#3a1510" stroke-width="0.6" opacity="0.5"/>`
        + ` <line x1="${w * 0.22}" y1="${h * 0.4}" x2="${w * 0.24}" y2="${h * 0.42}" stroke="#808080" stroke-width="0.5" opacity="0.3"/>`
        + ` <line x1="${w * 0.76}" y1="${h * 0.42}" x2="${w * 0.78}" y2="${h * 0.44}" stroke="#808080" stroke-width="0.5" opacity="0.3"/>`
        + ` <polygon points="${w * 0.88},${h * 0.36} ${w * 0.86},${h * 0.42} ${w * 0.9},${h * 0.42}" fill="#d0c0b0" opacity="0.15"/>`;
    return svgBase(w, h, c, 'IV', 'THE EMPEROR');
}

function drawHierophant(w: number, h: number): string {
    const c = ` <rect x="0" y="${h * 0.75}" width="${w}" height="${h * 0.25}" fill="#1a1028" opacity="0.9"/>`
        + ` <rect x="${w * 0.06}" y="${h * 0.18}" width="${w * 0.14}" height="${h * 0.63}" rx="3" fill="#180840" stroke="#c9a84c" stroke-width="1"/>`
        + ` <rect x="${w * 0.04}" y="${h * 0.16}" width="${w * 0.18}" height="${h * 0.03}" rx="2" fill="#c9a84c" opacity="0.7"/>`
        + ` <rect x="${w * 0.8}" y="${h * 0.18}" width="${w * 0.14}" height="${h * 0.63}" rx="3" fill="#0d0820" stroke="#c9a84c" stroke-width="1"/>`
        + ` <rect x="${w * 0.78}" y="${h * 0.16}" width="${w * 0.18}" height="${h * 0.03}" rx="2" fill="#c9a84c" opacity="0.7"/>`
        + ` <circle cx="${w * 0.33}" cy="${h * 0.72}" r="${w * 0.05}" fill="#f0c890"/>`
        + ` <path d="M${w * 0.28},${h * 0.77} Q${w * 0.33},${h * 0.75} ${w * 0.38},${h * 0.77} L${w * 0.38},${h * 0.87} L${w * 0.28},${h * 0.87}Z" fill="#806040" opacity="0.9"/>`
        + ` <circle cx="${w * 0.67}" cy="${h * 0.72}" r="${w * 0.05}" fill="#f0c890"/>`
        + ` <path d="M${w * 0.62},${h * 0.77} Q${w * 0.67},${h * 0.75} ${w * 0.72},${h * 0.77} L${w * 0.72},${h * 0.87} L${w * 0.62},${h * 0.87}Z" fill="#8060a0" opacity="0.9"/>`
        + ` <circle cx="${w * 0.37}" cy="${h * 0.76}" r="${w * 0.03}" fill="none" stroke="#c9a84c" stroke-width="1.5"/>`
        + ` <line x1="${w * 0.37}" y1="${h * 0.79}" x2="${w * 0.37}" y2="${h * 0.85}" stroke="#c9a84c" stroke-width="1.5"/>`
        + ` <line x1="${w * 0.35}" y1="${h * 0.82}" x2="${w * 0.39}" y2="${h * 0.82}" stroke="#c9a84c" stroke-width="1.2"/>`
        + ` <circle cx="${w * 0.63}" cy="${h * 0.76}" r="${w * 0.03}" fill="none" stroke="#d0d0d0" stroke-width="1.5"/>`
        + ` <line x1="${w * 0.63}" y1="${h * 0.79}" x2="${w * 0.63}" y2="${h * 0.85}" stroke="#d0d0d0" stroke-width="1.5"/>`
        + ` <line x1="${w * 0.61}" y1="${h * 0.82}" x2="${w * 0.65}" y2="${h * 0.82}" stroke="#d0d0d0" stroke-width="1.2"/>`
        + ` <ellipse cx="${w * 0.5}" cy="${h * 0.32}" rx="${w * 0.1}" ry="${w * 0.11}" fill="#f0c890"/>`
        + ` <rect x="${w * 0.36}" y="${h * 0.42}" width="${w * 0.28}" height="${h * 0.3}" rx="4" fill="#600000" opacity="0.95"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.42}" x2="${w * 0.5}" y2="${h * 0.72}" stroke="#c9a84c" stroke-width="0.8" opacity="0.35"/>`
        + ` <rect x="${w * 0.36}" y="${h * 0.19}" width="${w * 0.28}" height="${h * 0.05}" rx="2" fill="#c9a84c"/>`
        + ` <rect x="${w * 0.38}" y="${h * 0.14}" width="${w * 0.24}" height="${h * 0.05}" rx="2" fill="#c9a84c"/>`
        + ` <rect x="${w * 0.41}" y="${h * 0.1}" width="${w * 0.18}" height="${h * 0.04}" rx="2" fill="#c9a84c"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.09}" r="${w * 0.018}" fill="#ff4040"/>`
        + ` <line x1="${w * 0.67}" y1="${h * 0.18}" x2="${w * 0.7}" y2="${h * 0.68}" stroke="#c9a84c" stroke-width="2.5"/>`
        + ` <line x1="${w * 0.63}" y1="${h * 0.28}" x2="${w * 0.74}" y2="${h * 0.28}" stroke="#c9a84c" stroke-width="1.8"/>`
        + ` <line x1="${w * 0.63}" y1="${h * 0.34}" x2="${w * 0.74}" y2="${h * 0.34}" stroke="#c9a84c" stroke-width="1.5"/>`
        + ` <line x1="${w * 0.65}" y1="${h * 0.4}" x2="${w * 0.74}" y2="${h * 0.4}" stroke="#c9a84c" stroke-width="1.2"/>`
        + ` <line x1="${w * 0.38}" y1="${h * 0.48}" x2="${w * 0.26}" y2="${h * 0.42}" stroke="#f0c890" stroke-width="2.5"/>`
        + ` <circle cx="${w * 0.25}" cy="${h * 0.41}" r="${w * 0.03}" fill="#f0c890"/>`
        // EXTRA: floor tiles, window light, incense wisps
        + ` <line x1="${w * 0.25}" y1="${h * 0.88}" x2="${w * 0.75}" y2="${h * 0.88}" stroke="rgba(200,168,75,0.1)" stroke-width="0.4"/>`
        + ` <line x1="${w * 0.3}" y1="${h * 0.92}" x2="${w * 0.7}" y2="${h * 0.92}" stroke="rgba(200,168,75,0.08)" stroke-width="0.3"/>`
        + ` <rect x="${w * 0.44}" y="${h * 0.28}" width="${w * 0.12}" height="${h * 0.08}" rx="2" fill="#ffcc40" opacity="0.06"/>`
        + ` <path d="M${w * 0.5},${h * 0.68} Q${w * 0.52},${h * 0.64} ${w * 0.5},${h * 0.6}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>`
        + ` <path d="M${w * 0.51},${h * 0.66} Q${w * 0.49},${h * 0.62} ${w * 0.51},${h * 0.58}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="0.4"/>`;
    return svgBase(w, h, c, 'V', 'THE HIEROPHANT');
}

function drawLovers(w: number, h: number): string {
    const c = ` <path d="M0,${h * 0.7} L${w},${h * 0.7} L${w},${h} L0,${h}Z" fill="#0a1f08" opacity="0.8"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.13}" r="${w * 0.16}" fill="#ffcc40" opacity="0.15"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.13}" r="${w * 0.09}" fill="#ffcc40" opacity="0.22"/>`
        + ` <path d="M${w * 0.25},${h * 0.22} Q${w * 0.1},${h * 0.1} ${w * 0.05},${h * 0.25} Q${w * 0.14},${h * 0.3} ${w * 0.35},${h * 0.27}Z" fill="#e8e8ff" opacity="0.65"/>`
        + ` <path d="M${w * 0.75},${h * 0.22} Q${w * 0.9},${h * 0.1} ${w * 0.95},${h * 0.25} Q${w * 0.86},${h * 0.3} ${w * 0.65},${h * 0.27}Z" fill="#e8e8ff" opacity="0.65"/>`
        + ` <line x1="${w * 0.25}" y1="${h * 0.22}" x2="${w * 0.1}" y2="${h * 0.18}" stroke="#c0c0e0" stroke-width="0.8" opacity="0.5"/>`
        + ` <line x1="${w * 0.75}" y1="${h * 0.22}" x2="${w * 0.9}" y2="${h * 0.18}" stroke="#c0c0e0" stroke-width="0.8" opacity="0.5"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.2}" r="${w * 0.07}" fill="#f0c890"/>`
        + ` <path d="M${w * 0.43},${h * 0.26} Q${w * 0.5},${h * 0.36} ${w * 0.57},${h * 0.26}Z" fill="#ff8040" opacity="0.7"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.27}" x2="${w * 0.32}" y2="${h * 0.55}" stroke="#ffcc40" stroke-width="1" opacity="0.4"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.27}" x2="${w * 0.68}" y2="${h * 0.55}" stroke="#ffcc40" stroke-width="1" opacity="0.4"/>`
        + ` <line x1="${w * 0.72}" y1="${h * 0.7}" x2="${w * 0.72}" y2="${h * 0.42}" stroke="#3a1f08" stroke-width="4"/>`
        + ` <circle cx="${w * 0.72}" cy="${h * 0.37}" r="${w * 0.1}" fill="#a83820" opacity="0.75"/>`
        + ` <circle cx="${w * 0.68}" cy="${h * 0.42}" r="${w * 0.025}" fill="#cc2020"/>`
        + ` <circle cx="${w * 0.76}" cy="${h * 0.39}" r="${w * 0.02}" fill="#cc2020"/>`
        + ` <path d="M${w * 0.74},${h * 0.5} Q${w * 0.78},${h * 0.45} ${w * 0.74},${h * 0.42} Q${w * 0.76},${h * 0.38} ${w * 0.74},${h * 0.35}" fill="none" stroke="#408020" stroke-width="2"/>`
        + ` <line x1="${w * 0.28}" y1="${h * 0.7}" x2="${w * 0.28}" y2="${h * 0.44}" stroke="#1f3a08" stroke-width="4"/>`
        + ` <circle cx="${w * 0.28}" cy="${h * 0.39}" r="${w * 0.1}" fill="#1a5020" opacity="0.8"/>`
        + ` <ellipse cx="${w * 0.24}" cy="${h * 0.38}" rx="${w * 0.02}" ry="${w * 0.04}" fill="#ff6020" opacity="0.6"/>`
        + ` <ellipse cx="${w * 0.32}" cy="${h * 0.37}" rx="${w * 0.02}" ry="${w * 0.04}" fill="#ff6020" opacity="0.6"/>`
        + ` <circle cx="${w * 0.32}" cy="${h * 0.57}" r="${w * 0.07}" fill="#f0c890"/>`
        + ` <path d="M${w * 0.25},${h * 0.63} Q${w * 0.32},${h * 0.65} ${w * 0.39},${h * 0.63} L${w * 0.39},${h * 0.78} L${w * 0.25},${h * 0.78}Z" fill="#8060a0" opacity="0.85"/>`
        + ` <circle cx="${w * 0.68}" cy="${h * 0.57}" r="${w * 0.07}" fill="#f0c890"/>`
        + ` <path d="M${w * 0.61},${h * 0.63} Q${w * 0.68},${h * 0.65} ${w * 0.75},${h * 0.63} L${w * 0.75},${h * 0.78} L${w * 0.61},${h * 0.78}Z" fill="#a06030" opacity="0.85"/>`
        // EXTRA: small hearts, breeze lines, extra foliage
        + ` <path d="M${w * 0.48},${h * 0.48} Q${w * 0.47},${h * 0.46} ${w * 0.49},${h * 0.45} Q${w * 0.51},${h * 0.46} ${w * 0.5},${h * 0.48}Z" fill="#ff6080" opacity="0.35"/>`
        + ` <path d="M${w * 0.52},${h * 0.52} Q${w * 0.51},${h * 0.5} ${w * 0.53},${h * 0.49} Q${w * 0.55},${h * 0.5} ${w * 0.54},${h * 0.52}Z" fill="#ff6080" opacity="0.25"/>`
        + ` <path d="M${w * 0.15},${h * 0.65} Q${w * 0.2},${h * 0.63} ${w * 0.25},${h * 0.65}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="0.4"/>`
        + ` <circle cx="${w * 0.3}" cy="${h * 0.34}" r="${w * 0.015}" fill="#1a5020" opacity="0.5"/>`
        + ` <circle cx="${w * 0.7}" cy="${h * 0.33}" r="${w * 0.012}" fill="#a83820" opacity="0.4"/>`;
    return svgBase(w, h, c, 'VI', 'THE LOVERS');
}

function drawChariot(w: number, h: number): string {
    const c = ` <rect x="${w * 0.04}" y="${h * 0.42}" width="${w * 0.1}" height="${h * 0.22}" fill="#201040" opacity="0.75"/>`
        + ` <rect x="${w * 0.16}" y="${h * 0.36}" width="${w * 0.12}" height="${h * 0.28}" fill="#201040" opacity="0.75"/>`
        + ` <rect x="${w * 0.72}" y="${h * 0.38}" width="${w * 0.12}" height="${h * 0.26}" fill="#201040" opacity="0.75"/>`
        + ` <rect x="${w * 0.07}" y="${h * 0.46}" width="${w * 0.04}" height="${h * 0.05}" rx="1" fill="#ffaa30" opacity="0.5"/>`
        + ` <rect x="${w * 0.19}" y="${h * 0.4}" width="${w * 0.04}" height="${h * 0.06}" rx="1" fill="#ffaa30" opacity="0.4"/>`
        + ` <path d="M0,${h * 0.82} Q${w * 0.5},${h * 0.78} ${w},${h * 0.82} L${w},${h} L0,${h}Z" fill="#1a3060" opacity="0.5"/>`
        + ` <rect x="${w * 0.18}" y="${h * 0.38}" width="${w * 0.64}" height="${h * 0.08}" rx="3" fill="#080420" stroke="#c9a84c" stroke-width="1"/>`
        + ` <circle cx="${w * 0.3}" cy="${h * 0.42}" r="1.5" fill="#fff" opacity="0.7"/>`
        + ` <circle cx="${w * 0.42}" cy="${h * 0.41}" r="1.2" fill="#c9a84c" opacity="0.8"/>`
        + ` <circle cx="${w * 0.56}" cy="${h * 0.42}" r="1.5" fill="#fff" opacity="0.6"/>`
        + ` <circle cx="${w * 0.68}" cy="${h * 0.41}" r="1.2" fill="#fff" opacity="0.7"/>`
        + ` <rect x="${w * 0.18}" y="${h * 0.45}" width="${w * 0.64}" height="${h * 0.24}" rx="5" fill="#1a0840" stroke="#c9a84c" stroke-width="1.5" opacity="0.95"/>`
        + ` <path d="M${w * 0.32},${h * 0.46} Q${w * 0.5},${h * 0.5} ${w * 0.68},${h * 0.46}" fill="none" stroke="#c9a84c" stroke-width="0.8" opacity="0.6"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.57}" r="${w * 0.04}" fill="#ffcc00" opacity="0.6"/>`
        + ` <path d="M${w * 0.34},${h * 0.56} Q${w * 0.42},${h * 0.53} ${w * 0.46},${h * 0.57}" fill="none" stroke="#c9a84c" stroke-width="1.5"/>`
        + ` <path d="M${w * 0.66},${h * 0.56} Q${w * 0.58},${h * 0.53} ${w * 0.54},${h * 0.57}" fill="none" stroke="#c9a84c" stroke-width="1.5"/>`
        + ` <ellipse cx="${w * 0.28}" cy="${h * 0.75}" rx="${w * 0.12}" ry="${w * 0.07}" fill="#e0d8c0"/>`
        + ` <circle cx="${w * 0.38}" cy="${h * 0.71}" r="${w * 0.05}" fill="#e0d8c0"/>`
        + ` <circle cx="${w * 0.385}" cy="${h * 0.7}" r="${w * 0.018}" fill="#2a2010"/>`
        + ` <ellipse cx="${w * 0.72}" cy="${h * 0.75}" rx="${w * 0.12}" ry="${w * 0.07}" fill="#1a1010"/>`
        + ` <circle cx="${w * 0.62}" cy="${h * 0.71}" r="${w * 0.05}" fill="#1a1010"/>`
        + ` <circle cx="${w * 0.62}" cy="${h * 0.7}" r="${w * 0.018}" fill="#c9a84c"/>`
        + ` <ellipse cx="${w * 0.5}" cy="${h * 0.35}" rx="${w * 0.09}" ry="${w * 0.1}" fill="#f0c890"/>`
        + ` <rect x="${w * 0.4}" y="${h * 0.44}" width="${w * 0.2}" height="${h * 0.06}" rx="3" fill="#a0a0b0"/>`
        + ` <rect x="${w * 0.42}" y="${h * 0.5}" width="${w * 0.16}" height="${h * 0.08}" rx="3" fill="#d0c090" opacity="0.9"/>`
        + ` <path d="M${w * 0.4},${h * 0.43} Q${w * 0.37},${h * 0.39} ${w * 0.41},${h * 0.41}" fill="none" stroke="#c9a84c" stroke-width="2"/>`
        + ` <path d="M${w * 0.6},${h * 0.43} Q${w * 0.63},${h * 0.39} ${w * 0.59},${h * 0.41}" fill="none" stroke="#c9a84c" stroke-width="2"/>`
        + ` <rect x="${w * 0.43}" y="${h * 0.24}" width="${w * 0.14}" height="${h * 0.03}" rx="2" fill="#c9a84c"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.18}" x2="${w * 0.52}" y2="${h * 0.44}" stroke="#8a6820" stroke-width="2.5"/>`
        // EXTRA: wheel spokes, flag streamers, ground dust
        + ` <circle cx="${w * 0.2}" cy="${h * 0.82}" r="${w * 0.04}" fill="none" stroke="rgba(200,168,75,0.15)" stroke-width="0.5"/>`
        + ` <circle cx="${w * 0.8}" cy="${h * 0.82}" r="${w * 0.04}" fill="none" stroke="rgba(200,168,75,0.15)" stroke-width="0.5"/>`
        + ` <line x1="${w * 0.2}" y1="${h * 0.78}" x2="${w * 0.2}" y2="${h * 0.86}" stroke="rgba(200,168,75,0.1)" stroke-width="0.3"/>`
        + ` <line x1="${w * 0.16}" y1="${h * 0.82}" x2="${w * 0.24}" y2="${h * 0.82}" stroke="rgba(200,168,75,0.1)" stroke-width="0.3"/>`
        + ` <ellipse cx="${w * 0.5}" cy="${h * 0.84}" rx="${w * 0.15}" ry="${h * 0.01}" fill="rgba(200,168,75,0.06)"/>`;
    return svgBase(w, h, c, 'VII', 'THE CHARIOT');
}

function drawStrength(w: number, h: number): string {
    const c = ` <path d="M0,${h * 0.62} Q${w * 0.25},${h * 0.5} ${w * 0.5},${h * 0.58} Q${w * 0.75},${h * 0.66} ${w},${h * 0.55} L${w},${h} L0,${h}Z" fill="#1a3010" opacity="0.8"/>`
        + ` <path d="M${w * 0.6},${h * 0.62} L${w * 0.72},${h * 0.44} L${w * 0.84},${h * 0.56} L${w * 0.96},${h * 0.42} L${w},${h * 0.62} L${w},${h} L${w * 0.6},${h}Z" fill="#2a1830" opacity="0.5"/>`
        + ` <circle cx="${w * 0.12}" cy="${h * 0.68}" r="${w * 0.018}" fill="#ffcc40" opacity="0.7"/>`
        + ` <circle cx="${w * 0.08}" cy="${h * 0.72}" r="${w * 0.015}" fill="#ff80a0" opacity="0.7"/>`
        + ` <ellipse cx="${w * 0.48}" cy="${h * 0.7}" rx="${w * 0.26}" ry="${w * 0.13}" fill="#c8a030"/>`
        + ` <circle cx="${w * 0.64}" cy="${h * 0.63}" r="${w * 0.11}" fill="#c8a030"/>`
        + ` <circle cx="${w * 0.64}" cy="${h * 0.63}" r="${w * 0.155}" fill="none" stroke="#7a3800" stroke-width="${w * 0.045}" opacity="0.9"/>`
        + ` <circle cx="${w * 0.64}" cy="${h * 0.63}" r="${w * 0.13}" fill="none" stroke="#a05000" stroke-width="${w * 0.02}" opacity="0.5"/>`
        + ` <circle cx="${w * 0.68}" cy="${h * 0.61}" r="${w * 0.022}" fill="#fff8a0"/>`
        + ` <circle cx="${w * 0.68}" cy="${h * 0.61}" r="${w * 0.012}" fill="#1a0a00"/>`
        + ` <ellipse cx="${w * 0.28}" cy="${h * 0.82}" rx="${w * 0.06}" ry="${w * 0.04}" fill="#b89020"/>`
        + ` <ellipse cx="${w * 0.42}" cy="${h * 0.83}" rx="${w * 0.055}" ry="${w * 0.035}" fill="#b89020"/>`
        + ` <path d="M${w * 0.22},${h * 0.72} Q${w * 0.1},${h * 0.6} ${w * 0.18},${h * 0.5}" fill="none" stroke="#c8a030" stroke-width="4" stroke-linecap="round"/>`
        + ` <circle cx="${w * 0.18}" cy="${h * 0.49}" r="${w * 0.025}" fill="#8a5000"/>`
        + ` <ellipse cx="${w * 0.38}" cy="${h * 0.45}" rx="${w * 0.09}" ry="${w * 0.105}" fill="#f0c890"/>`
        + ` <path d="M${w * 0.28},${h * 0.53} Q${w * 0.38},${h * 0.58} ${w * 0.48},${h * 0.53} L${w * 0.5},${h * 0.75} L${w * 0.26},${h * 0.75}Z" fill="#ffffff" opacity="0.88"/>`
        + ` <circle cx="${w * 0.32}" cy="${h * 0.41}" r="${w * 0.02}" fill="#ff80a0"/>`
        + ` <circle cx="${w * 0.37}" cy="${h * 0.38}" r="${w * 0.02}" fill="#ff60c0"/>`
        + ` <circle cx="${w * 0.43}" cy="${h * 0.4}" r="${w * 0.02}" fill="#ff80a0"/>`
        + ` <path d="M${w * 0.26},${h * 0.31} Q${w * 0.3},${h * 0.27} ${w * 0.38},${h * 0.31} Q${w * 0.46},${h * 0.35} ${w * 0.5},${h * 0.31} Q${w * 0.46},${h * 0.27} ${w * 0.38},${h * 0.31} Q${w * 0.3},${h * 0.35} ${w * 0.26},${h * 0.31}" fill="none" stroke="#c9a84c" stroke-width="1.5"/>`
        + ` <path d="M${w * 0.48},${h * 0.55} Q${w * 0.56},${h * 0.58} ${w * 0.6},${h * 0.63}" fill="none" stroke="#f0c890" stroke-width="3" stroke-linecap="round"/>`
        + ` <path d="M${w * 0.48},${h * 0.57} Q${w * 0.54},${h * 0.61} ${w * 0.57},${h * 0.67}" fill="none" stroke="#f0c890" stroke-width="2" stroke-linecap="round"/>`
        // EXTRA: meadow flowers, lion tail detail, sunbeams
        + ` <circle cx="${w * 0.18}" cy="${h * 0.73}" r="${w * 0.012}" fill="#ffcc40" opacity="0.5"/>`
        + ` <circle cx="${w * 0.24}" cy="${h * 0.76}" r="${w * 0.01}" fill="#ff80a0" opacity="0.5"/>`
        + ` <circle cx="${w * 0.06}" cy="${h * 0.7}" r="${w * 0.01}" fill="#ffee80" opacity="0.4"/>`
        + ` <path d="M${w * 0.22},${h * 0.78} Q${w * 0.18},${h * 0.82} ${w * 0.2},${h * 0.85}" fill="none" stroke="#c8a030" stroke-width="1.5" opacity="0.6"/>`
        + ` <line x1="${w * 0.82}" y1="${h * 0.1}" x2="${w * 0.78}" y2="${h * 0.2}" stroke="rgba(255,240,160,0.08)" stroke-width="0.5"/>`;
    return svgBase(w, h, c, 'VIII', 'STRENGTH');
}

function drawHermit(w: number, h: number): string {
    const c = ` <path d="M0,${h * 0.5} Q${w * 0.35},${h * 0.35} ${w * 0.55},${h * 0.42} Q${w * 0.75},${h * 0.5} ${w},${h * 0.38} L${w},${h} L0,${h}Z" fill="#181828" opacity="0.9"/>`
        + ` <path d="M${w * 0.5},${h * 0.12} L${w * 0.36},${h * 0.38} L${w * 0.64},${h * 0.38}Z" fill="#d8d8e8" opacity="0.22"/>`
        + ` <circle cx="${w * 0.15}" cy="${h * 0.1}" r="1.5" fill="#fff" opacity="0.8"/>`
        + ` <circle cx="${w * 0.82}" cy="${h * 0.08}" r="1.2" fill="#c9a84c" opacity="0.9"/>`
        + ` <circle cx="${w * 0.08}" cy="${h * 0.25}" r="1" fill="#fff" opacity="0.5"/>`
        + ` <circle cx="${w * 0.92}" cy="${h * 0.22}" r="0.9" fill="#fff" opacity="0.6"/>`
        + ` <circle cx="${w * 0.7}" cy="${h * 0.16}" r="1" fill="#c8d8ff" opacity="0.6"/>`
        + ` <ellipse cx="${w * 0.5}" cy="${h * 0.36}" rx="${w * 0.09}" ry="${w * 0.1}" fill="#e0c898"/>`
        + ` <path d="M${w * 0.38},${h * 0.44} Q${w * 0.36},${h * 0.78} ${w * 0.4},${h * 0.88} Q${w * 0.5},${h * 0.92} ${w * 0.6},${h * 0.88} Q${w * 0.64},${h * 0.78} ${w * 0.62},${h * 0.44}Z" fill="#35354a"/>`
        + ` <path d="M${w * 0.38},${h * 0.44} Q${w * 0.36},${h * 0.34} ${w * 0.5},${h * 0.28} Q${w * 0.64},${h * 0.34} ${w * 0.62},${h * 0.44}Z" fill="#2a2a3a"/>`
        + ` <line x1="${w * 0.35}" y1="${h * 0.85}" x2="${w * 0.33}" y2="${h * 0.36}" stroke="#8a7060" stroke-width="3" stroke-linecap="round"/>`
        + ` <rect x="${w * 0.62}" y="${h * 0.3}" width="${w * 0.11}" height="${h * 0.14}" rx="3" fill="#0a0800" stroke="#c9a84c" stroke-width="1.2"/>`
        + ` <circle cx="${w * 0.675}" cy="${h * 0.37}" r="${w * 0.038}" fill="#ffcc00" opacity="0.85"/>`
        + ` <circle cx="${w * 0.675}" cy="${h * 0.37}" r="${w * 0.022}" fill="#fff8e0" opacity="0.95"/>`
        + ` <circle cx="${w * 0.675}" cy="${h * 0.37}" r="${w * 0.1}" fill="#ffcc00" opacity="0.05"/>`
        + ` <line x1="${w * 0.62}" y1="${h * 0.44}" x2="${w * 0.68}" y2="${h * 0.42}" stroke="#e0c898" stroke-width="2.5"/>`
        + ` <path d="M${w * 0.44},${h * 0.42} Q${w * 0.5},${h * 0.47} ${w * 0.56},${h * 0.42}" fill="#a0a090" opacity="0.7"/>`
        // EXTRA: snow texture, wind lines, extra mountain stars
        + ` <circle cx="${w * 0.48}" cy="${h * 0.32}" r="0.8" fill="#d8d8e8" opacity="0.2"/>`
        + ` <circle cx="${w * 0.52}" cy="${h * 0.35}" r="0.6" fill="#d8d8e8" opacity="0.15"/>`
        + ` <path d="M${w * 0.7},${h * 0.35} Q${w * 0.8},${h * 0.33} ${w * 0.9},${h * 0.36}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="0.4"/>`
        + ` <circle cx="${w * 0.25}" cy="${h * 0.18}" r="0.7" fill="#c8d8ff" opacity="0.4"/>`
        + ` <circle cx="${w * 0.6}" cy="${h * 0.06}" r="0.8" fill="#fff" opacity="0.4"/>`;
    return svgBase(w, h, c, 'IX', 'THE HERMIT');
}

function drawWheel(w: number, h: number): string {
    const c = ` <ellipse cx="${w * 0.1}" cy="${h * 0.5}" rx="${w * 0.1}" ry="${h * 0.04}" fill="#d0d8e8" opacity="0.25"/>`
        + ` <ellipse cx="${w * 0.9}" cy="${h * 0.48}" rx="${w * 0.1}" ry="${h * 0.04}" fill="#d0d8e8" opacity="0.25"/>`
        + ` <text x="${w * 0.08}" y="${h * 0.5}" font-family="serif" font-size="${w * 0.07}" fill="#c9a84c" text-anchor="middle" opacity="0.7">\u2652</text>`
        + ` <text x="${w * 0.92}" y="${h * 0.5}" font-family="serif" font-size="${w * 0.07}" fill="#c9a84c" text-anchor="middle" opacity="0.7">\u264C</text>`
        + ` <text x="${w * 0.5}" y="${h * 0.91}" font-family="serif" font-size="${w * 0.07}" fill="#c9a84c" text-anchor="middle" opacity="0.7">\u2649</text>`
        + ` <text x="${w * 0.5}" y="${h * 0.1}" font-family="serif" font-size="${w * 0.07}" fill="#c9a84c" text-anchor="middle" opacity="0.7">\u2645</text>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.48}" r="${w * 0.39}" fill="none" stroke="#c9a84c" stroke-width="2.5"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.48}" r="${w * 0.28}" fill="none" stroke="#8a6820" stroke-width="1.5"/>`
        + ` <text x="${w * 0.5}" y="${h * 0.22}" font-family="serif" font-size="${w * 0.055}" fill="#8a6820" text-anchor="middle" opacity="0.8">\u263F</text>`
        + ` <text x="${w * 0.78}" y="${h * 0.5}" font-family="serif" font-size="${w * 0.055}" fill="#8a6820" text-anchor="middle" opacity="0.8">\u2643</text>`
        + ` <text x="${w * 0.5}" y="${h * 0.76}" font-family="serif" font-size="${w * 0.055}" fill="#8a6820" text-anchor="middle" opacity="0.8">\u2644</text>`
        + ` <text x="${w * 0.22}" y="${h * 0.5}" font-family="serif" font-size="${w * 0.055}" fill="#8a6820" text-anchor="middle" opacity="0.8">\u2640</text>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.48}" r="${w * 0.11}" fill="#1a0820" stroke="#c9a84c" stroke-width="1.5"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.09}" x2="${w * 0.5}" y2="${h * 0.87}" stroke="#c9a84c" stroke-width="1"/>`
        + ` <line x1="${w * 0.11}" y1="${h * 0.48}" x2="${w * 0.89}" y2="${h * 0.48}" stroke="#c9a84c" stroke-width="1"/>`
        + ` <line x1="${w * 0.22}" y1="${h * 0.21}" x2="${w * 0.78}" y2="${h * 0.75}" stroke="#c9a84c" stroke-width="1"/>`
        + ` <line x1="${w * 0.78}" y1="${h * 0.21}" x2="${w * 0.22}" y2="${h * 0.75}" stroke="#c9a84c" stroke-width="1"/>`
        + ` <text x="${w * 0.5}" y="${h * 0.36}" font-family="serif" font-size="${w * 0.085}" fill="#c9a84c" text-anchor="middle" opacity="0.95" font-weight="bold">T</text>`
        + ` <text x="${w * 0.64}" y="${h * 0.5}" font-family="serif" font-size="${w * 0.085}" fill="#c9a84c" text-anchor="middle" opacity="0.95" font-weight="bold">A</text>`
        + ` <text x="${w * 0.5}" y="${h * 0.62}" font-family="serif" font-size="${w * 0.085}" fill="#c9a84c" text-anchor="middle" opacity="0.95" font-weight="bold">R</text>`
        + ` <text x="${w * 0.36}" y="${h * 0.5}" font-family="serif" font-size="${w * 0.085}" fill="#c9a84c" text-anchor="middle" opacity="0.95" font-weight="bold">O</text>`
        + ` <ellipse cx="${w * 0.5}" cy="${h * 0.12}" rx="${w * 0.07}" ry="${w * 0.05}" fill="#c8a030"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.1}" r="${w * 0.04}" fill="#f0c890"/>`
        + ` <circle cx="${w * 0.51}" cy="${h * 0.09}" r="${w * 0.015}" fill="#3a2010"/>`
        + ` <path d="M${w * 0.14},${h * 0.36} Q${w * 0.08},${h * 0.48} ${w * 0.12},${h * 0.6} Q${w * 0.1},${h * 0.68} ${w * 0.14},${h * 0.72}" fill="none" stroke="#408030" stroke-width="3.5" stroke-linecap="round"/>`
        + ` <circle cx="${w * 0.14}" cy="${h * 0.72}" r="${w * 0.02}" fill="#ff4040"/>`
        + ` <ellipse cx="${w * 0.84}" cy="${h * 0.6}" rx="${w * 0.05}" ry="${w * 0.065}" fill="#c8a030"/>`
        + ` <circle cx="${w * 0.84}" cy="${h * 0.54}" r="${w * 0.035}" fill="#c8a030"/>`
        + ` <path d="M${w * 0.81},${h * 0.52} L${w * 0.79},${h * 0.47}" stroke="#c8a030" stroke-width="2" stroke-linecap="round"/>`
        + ` <path d="M${w * 0.87},${h * 0.52} L${w * 0.89},${h * 0.47}" stroke="#c8a030" stroke-width="2" stroke-linecap="round"/>`
        // EXTRA: lightning arcs, extra zodiac marks, wheel spoke patterns
        + ` <path d="M${w * 0.35},${h * 0.15} Q${w * 0.36},${h * 0.18} ${w * 0.34},${h * 0.2}" fill="none" stroke="#c9a84c" stroke-width="0.4" opacity="0.3"/>`
        + ` <path d="M${w * 0.65},${h * 0.78} Q${w * 0.66},${h * 0.81} ${w * 0.64},${h * 0.83}" fill="none" stroke="#c9a84c" stroke-width="0.4" opacity="0.3"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.48}" r="${w * 0.05}" fill="none" stroke="#c9a84c" stroke-width="0.4" opacity="0.3"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.48}" r="${w * 0.34}" fill="none" stroke="#c9a84c" stroke-width="0.3" opacity="0.15" stroke-dasharray="2 4"/>`;
    return svgBase(w, h, c, 'X', 'WHEEL OF FORTUNE');
}

function drawJustice(w: number, h: number): string {
    const c = ` <rect x="${w * 0.06}" y="${h * 0.18}" width="${w * 0.14}" height="${h * 0.65}" rx="3" fill="#180840" stroke="#c9a84c" stroke-width="1"/>`
        + ` <rect x="${w * 0.04}" y="${h * 0.17}" width="${w * 0.18}" height="${h * 0.025}" rx="2" fill="#c9a84c" opacity="0.6"/>`
        + ` <rect x="${w * 0.8}" y="${h * 0.18}" width="${w * 0.14}" height="${h * 0.65}" rx="3" fill="#180840" stroke="#c9a84c" stroke-width="1"/>`
        + ` <rect x="${w * 0.78}" y="${h * 0.17}" width="${w * 0.18}" height="${h * 0.025}" rx="2" fill="#c9a84c" opacity="0.6"/>`
        + ` <rect x="${w * 0.18}" y="${h * 0.18}" width="${w * 0.64}" height="${h * 0.65}" rx="3" fill="#c9a84c" opacity="0.05"/>`
        + ` <ellipse cx="${w * 0.5}" cy="${h * 0.29}" rx="${w * 0.1}" ry="${w * 0.11}" fill="#f0c890"/>`
        + ` <circle cx="${w * 0.46}" cy="${h * 0.28}" r="${w * 0.016}" fill="#3a2010"/>`
        + ` <circle cx="${w * 0.54}" cy="${h * 0.28}" r="${w * 0.016}" fill="#3a2010"/>`
        + ` <rect x="${w * 0.36}" y="${h * 0.38}" width="${w * 0.28}" height="${h * 0.42}" rx="4" fill="#8b1a2a" opacity="0.95"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.38}" x2="${w * 0.5}" y2="${h * 0.8}" stroke="#c9a84c" stroke-width="0.8" opacity="0.3"/>`
        + ` <path d="M${w * 0.36},${h * 0.55} Q${w * 0.5},${h * 0.52} ${w * 0.64},${h * 0.55}" fill="none" stroke="#c9a84c" stroke-width="0.8" opacity="0.3"/>`
        + ` <rect x="${w * 0.38}" y="${h * 0.18}" width="${w * 0.24}" height="${h * 0.04}" rx="2" fill="#c9a84c"/>`
        + ` <line x1="${w * 0.43}" y1="${h * 0.18}" x2="${w * 0.42}" y2="${h * 0.13}" stroke="#c9a84c" stroke-width="2.5"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.18}" x2="${w * 0.5}" y2="${h * 0.11}" stroke="#c9a84c" stroke-width="3"/>`
        + ` <line x1="${w * 0.57}" y1="${h * 0.18}" x2="${w * 0.58}" y2="${h * 0.13}" stroke="#c9a84c" stroke-width="2.5"/>`
        + ` <line x1="${w * 0.36}" y1="${h * 0.44}" x2="${w * 0.22}" y2="${h * 0.38}" stroke="#f0c890" stroke-width="2.5"/>`
        + ` <line x1="${w * 0.22}" y1="${h * 0.38}" x2="${w * 0.5}" y2="${h * 0.34}" stroke="#c9a84c" stroke-width="1.5"/>`
        + ` <line x1="${w * 0.78}" y1="${h * 0.38}" x2="${w * 0.5}" y2="${h * 0.34}" stroke="#c9a84c" stroke-width="1.5"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.34}" x2="${w * 0.5}" y2="${h * 0.52}" stroke="#c9a84c" stroke-width="2"/>`
        + ` <path d="M${w * 0.16},${h * 0.46} Q${w * 0.22},${h * 0.5} ${w * 0.28},${h * 0.46}" fill="none" stroke="#c9a84c" stroke-width="1.5"/>`
        + ` <line x1="${w * 0.22}" y1="${h * 0.38}" x2="${w * 0.16}" y2="${h * 0.46}" stroke="#c9a84c" stroke-width="1"/>`
        + ` <line x1="${w * 0.22}" y1="${h * 0.38}" x2="${w * 0.28}" y2="${h * 0.46}" stroke="#c9a84c" stroke-width="1"/>`
        + ` <path d="M${w * 0.72},${h * 0.52} Q${w * 0.78},${h * 0.56} ${w * 0.84},${h * 0.52}" fill="none" stroke="#c9a84c" stroke-width="1.5"/>`
        + ` <line x1="${w * 0.78}" y1="${h * 0.38}" x2="${w * 0.72}" y2="${h * 0.52}" stroke="#c9a84c" stroke-width="1"/>`
        + ` <line x1="${w * 0.78}" y1="${h * 0.38}" x2="${w * 0.84}" y2="${h * 0.52}" stroke="#c9a84c" stroke-width="1"/>`
        + ` <line x1="${w * 0.64}" y1="${h * 0.44}" x2="${w * 0.72}" y2="${h * 0.38}" stroke="#f0c890" stroke-width="2.5"/>`
        + ` <line x1="${w * 0.72}" y1="${h * 0.16}" x2="${w * 0.74}" y2="${h * 0.66}" stroke="#c8c8d8" stroke-width="3"/>`
        + ` <line x1="${w * 0.67}" y1="${h * 0.41}" x2="${w * 0.79}" y2="${h * 0.43}" stroke="#c9a84c" stroke-width="1.8"/>`
        // EXTRA: floor pattern, curtain folds, extra crown gems
        + ` <line x1="${w * 0.2}" y1="${h * 0.83}" x2="${w * 0.8}" y2="${h * 0.83}" stroke="rgba(200,168,75,0.06)" stroke-width="0.3"/>`
        + ` <line x1="${w * 0.25}" y1="${h * 0.86}" x2="${w * 0.75}" y2="${h * 0.86}" stroke="rgba(200,168,75,0.04)" stroke-width="0.3"/>`
        + ` <path d="M${w * 0.22},${h * 0.25} Q${w * 0.21},${h * 0.35} ${w * 0.22},${h * 0.45}" fill="none" stroke="rgba(200,168,75,0.06)" stroke-width="0.3"/>`
        + ` <circle cx="${w * 0.45}" cy="${h * 0.14}" r="${w * 0.008}" fill="#ff4040" opacity="0.5"/>`
        + ` <circle cx="${w * 0.55}" cy="${h * 0.14}" r="${w * 0.008}" fill="#4040ff" opacity="0.5"/>`;
    return svgBase(w, h, c, 'XI', 'JUSTICE');
}

function drawHangedMan(w: number, h: number): string {
    const c = ` <line x1="${w * 0.25}" y1="${h * 0.12}" x2="${w * 0.25}" y2="${h * 0.88}" stroke="#4a2810" stroke-width="10"/>`
        + ` <line x1="${w * 0.75}" y1="${h * 0.12}" x2="${w * 0.75}" y2="${h * 0.88}" stroke="#4a2810" stroke-width="10"/>`
        + ` <line x1="${w * 0.25}" y1="${h * 0.25}" x2="${w * 0.75}" y2="${h * 0.25}" stroke="#4a2810" stroke-width="7"/>`
        + ` <circle cx="${w * 0.25}" cy="${h * 0.14}" r="${w * 0.055}" fill="#306020" opacity="0.75"/>`
        + ` <circle cx="${w * 0.2}" cy="${h * 0.18}" r="${w * 0.04}" fill="#406828" opacity="0.7"/>`
        + ` <circle cx="${w * 0.3}" cy="${h * 0.17}" r="${w * 0.04}" fill="#406828" opacity="0.7"/>`
        + ` <circle cx="${w * 0.75}" cy="${h * 0.14}" r="${w * 0.055}" fill="#306020" opacity="0.75"/>`
        + ` <circle cx="${w * 0.7}" cy="${h * 0.18}" r="${w * 0.04}" fill="#406828" opacity="0.7"/>`
        + ` <circle cx="${w * 0.8}" cy="${h * 0.17}" r="${w * 0.04}" fill="#406828" opacity="0.7"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.25}" x2="${w * 0.5}" y2="${h * 0.35}" stroke="#c8a870" stroke-width="1.5"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.72}" r="${w * 0.1}" fill="#f0c890"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.72}" r="${w * 0.14}" fill="none" stroke="#c9a84c" stroke-width="1.2" opacity="0.6" stroke-dasharray="3 3"/>`
        + ` <rect x="${w * 0.42}" y="${h * 0.48}" width="${w * 0.16}" height="${h * 0.24}" rx="3" fill="#2040a0" opacity="0.85"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.48}" x2="${w * 0.5}" y2="${h * 0.35}" stroke="#a0a0b0" stroke-width="3"/>`
        + ` <path d="M${w * 0.42},${h * 0.48} Q${w * 0.35},${h * 0.44} ${w * 0.38},${h * 0.38}" fill="none" stroke="#c84040" stroke-width="3"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.5}" x2="${w * 0.38}" y2="${h * 0.42}" stroke="#2040a0" stroke-width="3"/>`
        + ` <line x1="${w * 0.42}" y1="${h * 0.58}" x2="${w * 0.33}" y2="${h * 0.65}" stroke="#f0c890" stroke-width="2"/>`
        + ` <line x1="${w * 0.58}" y1="${h * 0.58}" x2="${w * 0.67}" y2="${h * 0.65}" stroke="#f0c890" stroke-width="2"/>`
        + ` <path d="M${w * 0.46},${h * 0.74} Q${w * 0.5},${h * 0.77} ${w * 0.54},${h * 0.74}" fill="none" stroke="#8a6840" stroke-width="1"/>`
        + ` <circle cx="${w * 0.46}" cy="${h * 0.7}" r="${w * 0.014}" fill="#3a2010"/>`
        + ` <circle cx="${w * 0.54}" cy="${h * 0.7}" r="${w * 0.014}" fill="#3a2010"/>`
        // EXTRA: dripping leaves, extra leaf clusters, rope texture
        + ` <circle cx="${w * 0.35}" cy="${h * 0.15}" r="${w * 0.025}" fill="#406828" opacity="0.5"/>`
        + ` <circle cx="${w * 0.65}" cy="${h * 0.16}" r="${w * 0.025}" fill="#406828" opacity="0.5"/>`
        + ` <circle cx="${w * 0.28}" cy="${h * 0.2}" r="${w * 0.02}" fill="#508030" opacity="0.4"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.27}" x2="${w * 0.5}" y2="${h * 0.29}" stroke="#a09060" stroke-width="1" opacity="0.4"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.31}" x2="${w * 0.5}" y2="${h * 0.33}" stroke="#a09060" stroke-width="1" opacity="0.3"/>`;
    return svgBase(w, h, c, 'XII', 'THE HANGED MAN');
}

function drawDeath(w: number, h: number): string {
    const c = ` <rect x="0" y="0" width="${w}" height="${h}" fill="#090810"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.8}" r="${w * 0.25}" fill="#ff5020" opacity="0.1"/>`
        + ` <rect x="0" y="${h * 0.68}" width="${w}" height="${h * 0.32}" fill="#1a1008" opacity="0.8"/>`
        + ` <ellipse cx="${w * 0.45}" cy="${h * 0.6}" rx="${w * 0.22}" ry="${w * 0.1}" fill="#e8e0d0" opacity="0.9"/>`
        + ` <ellipse cx="${w * 0.64}" cy="${h * 0.55}" rx="${w * 0.1}" ry="${w * 0.08}" fill="#e8e0d0" opacity="0.9"/>`
        + ` <ellipse cx="${w * 0.73}" cy="${h * 0.5}" rx="${w * 0.06}" ry="${w * 0.055}" fill="#e0d8c8" opacity="0.9"/>`
        + ` <line x1="${w * 0.35}" y1="${h * 0.68}" x2="${w * 0.32}" y2="${h * 0.83}" stroke="#e0d8c8" stroke-width="4"/>`
        + ` <line x1="${w * 0.42}" y1="${h * 0.69}" x2="${w * 0.4}" y2="${h * 0.83}" stroke="#e0d8c8" stroke-width="4"/>`
        + ` <line x1="${w * 0.52}" y1="${h * 0.69}" x2="${w * 0.54}" y2="${h * 0.83}" stroke="#e0d8c8" stroke-width="4"/>`
        + ` <line x1="${w * 0.6}" y1="${h * 0.68}" x2="${w * 0.63}" y2="${h * 0.83}" stroke="#e0d8c8" stroke-width="4"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.32}" r="${w * 0.07}" fill="#e8e0d0"/>`
        + ` <ellipse cx="${w * 0.46}" cy="${h * 0.31}" rx="${w * 0.02}" ry="${w * 0.025}" fill="#1a1008"/>`
        + ` <ellipse cx="${w * 0.54}" cy="${h * 0.31}" rx="${w * 0.02}" ry="${w * 0.025}" fill="#1a1008"/>`
        + ` <path d="M${w * 0.46},${h * 0.36} L${w * 0.54},${h * 0.36}" stroke="#e8e0d0" stroke-width="1.5"/>`
        + ` <rect x="${w * 0.43}" y="${h * 0.38}" width="${w * 0.14}" height="${h * 0.14}" rx="2" fill="none" stroke="#e8e0d0" stroke-width="1.5"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.38}" x2="${w * 0.5}" y2="${h * 0.52}" stroke="#e8e0d0" stroke-width="1"/>`
        + ` <line x1="${w * 0.43}" y1="${h * 0.44}" x2="${w * 0.57}" y2="${h * 0.44}" stroke="#e8e0d0" stroke-width="0.8"/>`
        + ` <line x1="${w * 0.65}" y1="${h * 0.18}" x2="${w * 0.65}" y2="${h * 0.55}" stroke="#c0c0c0" stroke-width="2"/>`
        + ` <rect x="${w * 0.65}" y="${h * 0.18}" width="${w * 0.2}" height="${h * 0.12}" rx="2" fill="#e8e8e8" opacity="0.9"/>`
        + ` <circle cx="${w * 0.78}" cy="${h * 0.24}" r="${w * 0.04}" fill="#ffffff" opacity="0.95"/>`
        + ` <ellipse cx="${w * 0.2}" cy="${h * 0.72}" rx="${w * 0.1}" ry="${h * 0.04}" fill="#f0c890" opacity="0.6"/>`
        + ` <circle cx="${w * 0.32}" cy="${h * 0.64}" r="${w * 0.04}" fill="#f0c890"/>`
        + ` <ellipse cx="${w * 0.32}" cy="${h * 0.7}" rx="${w * 0.03}" ry="${w * 0.04}" fill="#d0a020" opacity="0.8"/>`
        // EXTRA: crows/birds, extra bones, mist wisps
        + ` <path d="M${w * 0.12},${h * 0.15} L${w * 0.1},${h * 0.13} L${w * 0.08},${h * 0.15}" fill="none" stroke="#2a2030" stroke-width="1" opacity="0.6"/>`
        + ` <path d="M${w * 0.86},${h * 0.22} L${w * 0.84},${h * 0.2} L${w * 0.82},${h * 0.22}" fill="none" stroke="#2a2030" stroke-width="0.8" opacity="0.5"/>`
        + ` <line x1="${w * 0.15}" y1="${h * 0.75}" x2="${w * 0.18}" y2="${h * 0.76}" stroke="#e0d8c8" stroke-width="1.5" opacity="0.4"/>`
        + ` <path d="M${w * 0.05},${h * 0.7} Q${w * 0.15},${h * 0.68} ${w * 0.25},${h * 0.7}" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="2"/>`
        + ` <path d="M${w * 0.7},${h * 0.72} Q${w * 0.8},${h * 0.7} ${w * 0.9},${h * 0.73}" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="2"/>`;
    return svgBase(w, h, c, 'XIII', 'DEATH');
}

function drawTemperance(w: number, h: number): string {
    const c = ` <circle cx="${w * 0.5}" cy="${h * 0.82}" r="${w * 0.2}" fill="#ffcc30" opacity="0.14"/>`
        + ` <path d="M0,${h * 0.72} Q${w * 0.3},${h * 0.6} ${w * 0.6},${h * 0.65} Q${w * 0.8},${h * 0.72} ${w},${h * 0.6} L${w},${h} L0,${h}Z" fill="#0a1a0a" opacity="0.8"/>`
        + ` <ellipse cx="${w * 0.38}" cy="${h * 0.72}" rx="${w * 0.2}" ry="${w * 0.08}" fill="#2060a0" opacity="0.7"/>`
        + ` <path d="M${w * 0.22},${h * 0.72} Q${w * 0.38},${h * 0.69} ${w * 0.54},${h * 0.72}" fill="none" stroke="#4090c8" stroke-width="1" opacity="0.5"/>`
        + ` <line x1="${w * 0.2}" y1="${h * 0.72}" x2="${w * 0.2}" y2="${h * 0.58}" stroke="#4a8020" stroke-width="2"/>`
        + ` <ellipse cx="${w * 0.2}" cy="${h * 0.57}" rx="${w * 0.03}" ry="${h * 0.04}" fill="#9030d0"/>`
        + ` <line x1="${w * 0.26}" y1="${h * 0.72}" x2="${w * 0.24}" y2="${h * 0.6}" stroke="#4a8020" stroke-width="2"/>`
        + ` <ellipse cx="${w * 0.24}" cy="${h * 0.59}" rx="${w * 0.03}" ry="${h * 0.04}" fill="#9030d0"/>`
        + ` <path d="M${w * 0.55},${h * 0.72} Q${w * 0.7},${h * 0.65} ${w * 0.85},${h * 0.5} Q${w * 0.9},${h * 0.45} ${w},${h * 0.42}" fill="none" stroke="#c9a84c" stroke-width="1" opacity="0.4"/>`
        + ` <path d="M${w * 0.7},${h * 0.4} L${w * 0.82},${h * 0.25} L${w * 0.9},${h * 0.4}Z" fill="#2a1830" opacity="0.5"/>`
        + ` <path d="M${w * 0.3},${h * 0.42} Q${w * 0.18},${h * 0.32} ${w * 0.12},${h * 0.42} Q${w * 0.2},${h * 0.48} ${w * 0.35},${h * 0.46}Z" fill="#e0e8ff" opacity="0.7"/>`
        + ` <path d="M${w * 0.7},${h * 0.42} Q${w * 0.82},${h * 0.32} ${w * 0.88},${h * 0.42} Q${w * 0.8},${h * 0.48} ${w * 0.65},${h * 0.46}Z" fill="#e0e8ff" opacity="0.7"/>`
        + ` <line x1="${w * 0.3}" y1="${h * 0.42}" x2="${w * 0.18}" y2="${h * 0.32}" stroke="#c8d0f0" stroke-width="0.8" opacity="0.4"/>`
        + ` <line x1="${w * 0.3}" y1="${h * 0.44}" x2="${w * 0.14}" y2="${h * 0.38}" stroke="#c8d0f0" stroke-width="0.8" opacity="0.4"/>`
        + ` <ellipse cx="${w * 0.5}" cy="${h * 0.58}" rx="${w * 0.16}" ry="${h * 0.16}" fill="#ffffff" opacity="0.88"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.32}" r="${w * 0.09}" fill="#f0c890"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.3}" r="${w * 0.04}" fill="#ffcc00" opacity="0.8"/>`
        + ` <circle cx="${w * 0.46}" cy="${h * 0.32}" r="${w * 0.015}" fill="#3a2010"/>`
        + ` <circle cx="${w * 0.54}" cy="${h * 0.32}" r="${w * 0.015}" fill="#3a2010"/>`
        + ` <rect x="${w * 0.32}" y="${h * 0.44}" width="${w * 0.08}" height="${h * 0.1}" rx="2" fill="#c9a84c"/>`
        + ` <rect x="${w * 0.6}" y="${h * 0.44}" width="${w * 0.08}" height="${h * 0.1}" rx="2" fill="#c9a84c"/>`
        + ` <path d="M${w * 0.4},${h * 0.48} Q${w * 0.5},${h * 0.44} ${w * 0.6},${h * 0.5}" fill="none" stroke="#60a0ff" stroke-width="2.5" opacity="0.85"/>`
        + ` <polygon points="${w * 0.5},${h * 0.5} ${w * 0.44},${h * 0.6} ${w * 0.56},${h * 0.6}" fill="none" stroke="#c9a84c" stroke-width="1.2"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.56}" r="${w * 0.016}" fill="#c9a84c"/>`
        // EXTRA: rainbow arcs, flower details, light rays
        + ` <path d="M${w * 0.3},${h * 0.2} Q${w * 0.5},${h * 0.15} ${w * 0.7},${h * 0.2}" fill="none" stroke="#ff6060" stroke-width="0.5" opacity="0.12"/>`
        + ` <path d="M${w * 0.32},${h * 0.22} Q${w * 0.5},${h * 0.17} ${w * 0.68},${h * 0.22}" fill="none" stroke="#60ff60" stroke-width="0.5" opacity="0.1"/>`
        + ` <path d="M${w * 0.34},${h * 0.24} Q${w * 0.5},${h * 0.19} ${w * 0.66},${h * 0.24}" fill="none" stroke="#6060ff" stroke-width="0.5" opacity="0.08"/>`
        + ` <circle cx="${w * 0.18}" cy="${h * 0.62}" r="${w * 0.008}" fill="#9030d0" opacity="0.5"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.26}" x2="${w * 0.5}" y2="${h * 0.22}" stroke="rgba(255,204,0,0.15)" stroke-width="0.5"/>`;
    return svgBase(w, h, c, 'XIV', 'TEMPERANCE');
}

function drawDevil(w: number, h: number): string {
    const c = ` <rect x="0" y="0" width="${w}" height="${h}" fill="#050108"/>`
        + ` <path d="M${w * 0.28},${h * 0.42} Q${w * 0.12},${h * 0.28} ${w * 0.04},${h * 0.4} Q${w * 0.08},${h * 0.52} ${w * 0.3},${h * 0.5}Z" fill="#3a1020" stroke="#c9a84c" stroke-width="0.5"/>`
        + ` <path d="M${w * 0.72},${h * 0.42} Q${w * 0.88},${h * 0.28} ${w * 0.96},${h * 0.4} Q${w * 0.92},${h * 0.52} ${w * 0.7},${h * 0.5}Z" fill="#3a1020" stroke="#c9a84c" stroke-width="0.5"/>`
        + ` <line x1="${w * 0.08}" y1="${h * 0.32}" x2="${w * 0.26}" y2="${h * 0.44}" stroke="#3a1020" stroke-width="0.8" opacity="0.5"/>`
        + ` <line x1="${w * 0.08}" y1="${h * 0.38}" x2="${w * 0.26}" y2="${h * 0.46}" stroke="#3a1020" stroke-width="0.8" opacity="0.5"/>`
        + ` <line x1="${w * 0.92}" y1="${h * 0.32}" x2="${w * 0.74}" y2="${h * 0.44}" stroke="#3a1020" stroke-width="0.8" opacity="0.5"/>`
        + ` <ellipse cx="${w * 0.5}" cy="${h * 0.55}" rx="${w * 0.2}" ry="${h * 0.17}" fill="#2a0a08"/>`
        + ` <path d="M${w * 0.42},${h * 0.25} Q${w * 0.38},${h * 0.15} ${w * 0.35},${h * 0.2}" fill="none" stroke="#8b1a2a" stroke-width="4.5" stroke-linecap="round"/>`
        + ` <path d="M${w * 0.58},${h * 0.25} Q${w * 0.62},${h * 0.15} ${w * 0.65},${h * 0.2}" fill="none" stroke="#8b1a2a" stroke-width="4.5" stroke-linecap="round"/>`
        + ` <ellipse cx="${w * 0.5}" cy="${h * 0.3}" rx="${w * 0.13}" ry="${w * 0.12}" fill="#1a0808"/>`
        + ` <polygon points="${w * 0.5},${h * 0.16} ${w * 0.56},${h * 0.24} ${w * 0.44},${h * 0.24}" fill="none" stroke="#c9a84c" stroke-width="1" opacity="0.6"/>`
        + ` <circle cx="${w * 0.44}" cy="${h * 0.28}" r="${w * 0.025}" fill="#ff2020" opacity="0.95"/>`
        + ` <circle cx="${w * 0.56}" cy="${h * 0.28}" r="${w * 0.025}" fill="#ff2020" opacity="0.95"/>`
        + ` <circle cx="${w * 0.44}" cy="${h * 0.28}" r="${w * 0.01}" fill="#ff8080"/>`
        + ` <circle cx="${w * 0.56}" cy="${h * 0.28}" r="${w * 0.01}" fill="#ff8080"/>`
        + ` <path d="M${w * 0.46},${h * 0.34} Q${w * 0.5},${h * 0.37} ${w * 0.54},${h * 0.34}" fill="none" stroke="#ff4040" stroke-width="1.2"/>`
        + ` <rect x="${w * 0.35}" y="${h * 0.65}" width="${w * 0.3}" height="${h * 0.1}" rx="3" fill="#1a1020" stroke="#c9a84c" stroke-width="0.8"/>`
        + ` <circle cx="${w * 0.35}" cy="${h * 0.72}" r="${w * 0.05}" fill="#f0c890"/>`
        + ` <ellipse cx="${w * 0.35}" cy="${h * 0.79}" rx="${w * 0.04}" ry="${w * 0.05}" fill="#804020"/>`
        + ` <path d="M${w * 0.35},${h * 0.67} Q${w * 0.44},${h * 0.66} ${w * 0.5},${h * 0.68}" fill="none" stroke="#606060" stroke-width="1.5"/>`
        + ` <circle cx="${w * 0.65}" cy="${h * 0.72}" r="${w * 0.05}" fill="#f0c890"/>`
        + ` <ellipse cx="${w * 0.65}" cy="${h * 0.79}" rx="${w * 0.04}" ry="${w * 0.05}" fill="#408040"/>`
        + ` <path d="M${w * 0.65},${h * 0.67} Q${w * 0.56},${h * 0.66} ${w * 0.5},${h * 0.68}" fill="none" stroke="#606060" stroke-width="1.5"/>`
        + ` <line x1="${w * 0.6}" y1="${h * 0.45}" x2="${w * 0.65}" y2="${h * 0.32}" stroke="#8a6820" stroke-width="2"/>`
        + ` <ellipse cx="${w * 0.65}" cy="${h * 0.3}" rx="${w * 0.03}" ry="${h * 0.04}" fill="#ff8000" opacity="0.9"/>`
        + ` <ellipse cx="${w * 0.65}" cy="${h * 0.28}" rx="${w * 0.02}" ry="${h * 0.025}" fill="#ffee80" opacity="0.9"/>`
        // EXTRA: smoke, tail details, extra chain links
        + ` <path d="M${w * 0.5},${h * 0.12} Q${w * 0.52},${h * 0.08} ${w * 0.5},${h * 0.05}" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1.5"/>`
        + ` <path d="M${w * 0.48},${h * 0.1} Q${w * 0.46},${h * 0.06} ${w * 0.48},${h * 0.03}" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>`
        + ` <path d="M${w * 0.42},${h * 0.78} Q${w * 0.4},${h * 0.82} ${w * 0.42},${h * 0.86}" fill="none" stroke="#804020" stroke-width="1" opacity="0.5"/>`
        + ` <circle cx="${w * 0.42}" cy="${h * 0.66}" r="${w * 0.008}" fill="#606060" opacity="0.5"/>`
        + ` <circle cx="${w * 0.58}" cy="${h * 0.66}" r="${w * 0.008}" fill="#606060" opacity="0.5"/>`;
    return svgBase(w, h, c, 'XV', 'THE DEVIL');
}

function drawTower(w: number, h: number): string {
    const c = ` <rect x="0" y="0" width="${w}" height="${h * 0.75}" fill="#0a0810"/>`
        + ` <path d="M${w * 0.62},${h * 0.08} L${w * 0.5},${h * 0.28} L${w * 0.56},${h * 0.28} L${w * 0.44},${h * 0.46}" fill="none" stroke="#ffe060" stroke-width="3" opacity="0.95"/>`
        + ` <path d="M${w * 0.62},${h * 0.08} L${w * 0.5},${h * 0.28} L${w * 0.56},${h * 0.28} L${w * 0.44},${h * 0.46}" fill="none" stroke="#fff" stroke-width="1" opacity="0.4"/>`
        + ` <rect x="${w * 0.28}" y="${h * 0.25}" width="${w * 0.44}" height="${h * 0.5}" rx="3" fill="#2a2030" stroke="#c9a84c" stroke-width="0.8"/>`
        + ` <line x1="${w * 0.28}" y1="${h * 0.45}" x2="${w * 0.72}" y2="${h * 0.45}" stroke="#3a3048" stroke-width="0.5" opacity="0.5"/>`
        + ` <line x1="${w * 0.28}" y1="${h * 0.6}" x2="${w * 0.72}" y2="${h * 0.6}" stroke="#3a3048" stroke-width="0.5" opacity="0.5"/>`
        + ` <rect x="${w * 0.24}" y="${h * 0.2}" width="${w * 0.52}" height="${h * 0.07}" rx="2" fill="#3a2040" stroke="#c9a84c" stroke-width="0.8"/>`
        + ` <rect x="${w * 0.38}" y="${h * 0.35}" width="${w * 0.1}" height="${h * 0.12}" rx="2" fill="#ffaa20" opacity="0.75"/>`
        + ` <rect x="${w * 0.52}" y="${h * 0.42}" width="${w * 0.1}" height="${h * 0.1}" rx="2" fill="#ffaa20" opacity="0.5"/>`
        + ` <rect x="${w * 0.38}" y="${h * 0.58}" width="${w * 0.08}" height="${h * 0.1}" rx="2" fill="#ffaa20" opacity="0.3"/>`
        + ` <rect x="0" y="${h * 0.73}" width="${w}" height="${h * 0.27}" fill="#100808" opacity="0.9"/>`
        + ` <rect x="${w * 0.58}" y="${h * 0.13}" width="${w * 0.22}" height="${h * 0.055}" rx="2" fill="#c9a84c" transform="rotate(-22,${w * 0.7},${h * 0.16})"/>`
        + ` <circle cx="${w * 0.22}" cy="${h * 0.55}" r="${w * 0.05}" fill="#f0c890"/>`
        + ` <rect x="${w * 0.18}" y="${h * 0.6}" width="${w * 0.08}" height="${h * 0.1}" rx="2" fill="#c04040" transform="rotate(30,${w * 0.22},${h * 0.65})"/>`
        + ` <line x1="${w * 0.18}" y1="${h * 0.58}" x2="${w * 0.1}" y2="${h * 0.64}" stroke="#f0c890" stroke-width="2.5"/>`
        + ` <circle cx="${w * 0.72}" cy="${h * 0.58}" r="${w * 0.05}" fill="#f0c890"/>`
        + ` <rect x="${w * 0.68}" y="${h * 0.63}" width="${w * 0.08}" height="${h * 0.1}" rx="2" fill="#4040c0" transform="rotate(-25,${w * 0.72},${h * 0.68})"/>`
        + ` <line x1="${w * 0.78}" y1="${h * 0.56}" x2="${w * 0.86}" y2="${h * 0.62}" stroke="#f0c890" stroke-width="2.5"/>`
        + ` <ellipse cx="${w * 0.36}" cy="${h * 0.2}" rx="${w * 0.045}" ry="${h * 0.045}" fill="#ff4010" opacity="0.85"/>`
        + ` <ellipse cx="${w * 0.5}" cy="${h * 0.17}" rx="${w * 0.045}" ry="${h * 0.055}" fill="#ff8020" opacity="0.95"/>`
        + ` <ellipse cx="${w * 0.62}" cy="${h * 0.21}" rx="${w * 0.035}" ry="${h * 0.035}" fill="#ff4010" opacity="0.85"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.17}" r="${w * 0.02}" fill="#ffee80"/>`
        // EXTRA: rain/debris, extra lightning branches, ground cracks
        + ` <line x1="${w * 0.15}" y1="${h * 0.3}" x2="${w * 0.14}" y2="${h * 0.35}" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>`
        + ` <line x1="${w * 0.85}" y1="${h * 0.25}" x2="${w * 0.84}" y2="${h * 0.3}" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>`
        + ` <line x1="${w * 0.35}" y1="${h * 0.4}" x2="${w * 0.34}" y2="${h * 0.45}" stroke="rgba(255,255,255,0.06)" stroke-width="0.4"/>`
        + ` <path d="M${w * 0.56},${h * 0.28} L${w * 0.6},${h * 0.35}" fill="none" stroke="#ffe060" stroke-width="1" opacity="0.3"/>`
        + ` <line x1="${w * 0.35}" y1="${h * 0.76}" x2="${w * 0.4}" y2="${h * 0.78}" stroke="#1a0808" stroke-width="0.5" opacity="0.4"/>`;
    return svgBase(w, h, c, 'XVI', 'THE TOWER');
}

function drawStar(w: number, h: number): string {
    const c = ` <circle cx="${w * 0.5}" cy="${h * 0.15}" r="${w * 0.1}" fill="#fff8c0" opacity="0.9"/>`
        + ` <polygon points="${w * 0.5},${h * 0.07} ${w * 0.52},${h * 0.14} ${w * 0.59},${h * 0.15} ${w * 0.54},${h * 0.19} ${w * 0.56},${h * 0.26} ${w * 0.5},${h * 0.22} ${w * 0.44},${h * 0.26} ${w * 0.46},${h * 0.19} ${w * 0.41},${h * 0.15} ${w * 0.48},${h * 0.14}" fill="#ffe040"/>`
        + ` <circle cx="${w * 0.22}" cy="${h * 0.12}" r="2" fill="#c8d8ff" opacity="0.8"/>`
        + ` <circle cx="${w * 0.78}" cy="${h * 0.1}" r="2.5" fill="#c8d8ff" opacity="0.9"/>`
        + ` <circle cx="${w * 0.15}" cy="${h * 0.3}" r="1.5" fill="#fff" opacity="0.6"/>`
        + ` <circle cx="${w * 0.85}" cy="${h * 0.25}" r="1.5" fill="#ffe0a0" opacity="0.7"/>`
        + ` <circle cx="${w * 0.88}" cy="${h * 0.42}" r="1.2" fill="#c8d8ff" opacity="0.5"/>`
        + ` <polygon points="${w * 0.68},${h * 0.08} ${w * 0.695},${h * 0.13} ${w * 0.73},${h * 0.13} ${w * 0.705},${h * 0.15} ${w * 0.715},${h * 0.18} ${w * 0.68},${h * 0.16} ${w * 0.645},${h * 0.18} ${w * 0.655},${h * 0.15} ${w * 0.63},${h * 0.13} ${w * 0.665},${h * 0.13}" fill="#c9a84c" opacity="0.7"/>`
        + ` <polygon points="${w * 0.3},${h * 0.25} ${w * 0.315},${h * 0.28} ${w * 0.34},${h * 0.28} ${w * 0.325},${h * 0.3} ${w * 0.33},${h * 0.33} ${w * 0.3},${h * 0.315} ${w * 0.27},${h * 0.33} ${w * 0.275},${h * 0.3} ${w * 0.26},${h * 0.28} ${w * 0.285},${h * 0.28}" fill="#c8d8ff" opacity="0.7"/>`
        + ` <path d="M0,${h * 0.72} Q${w * 0.3},${h * 0.55} ${w * 0.6},${h * 0.65} Q${w * 0.8},${h * 0.72} ${w},${h * 0.6} L${w},${h} L0,${h}Z" fill="#0a1a0a"/>`
        + ` <ellipse cx="${w * 0.32}" cy="${h * 0.75}" rx="${w * 0.22}" ry="${w * 0.1}" fill="#1a4870" opacity="0.85"/>`
        + ` <path d="M${w * 0.18},${h * 0.75} Q${w * 0.32},${h * 0.72} ${w * 0.46},${h * 0.75}" fill="none" stroke="#4080c0" stroke-width="0.8" opacity="0.5"/>`
        + ` <line x1="${w * 0.82}" y1="${h * 0.6}" x2="${w * 0.82}" y2="${h * 0.85}" stroke="#1a3010" stroke-width="4"/>`
        + ` <path d="M${w * 0.82},${h * 0.65} Q${w * 0.9},${h * 0.58} ${w * 0.95},${h * 0.62} Q${w * 0.88},${h * 0.66} ${w * 0.82},${h * 0.65}" fill="#1a3010"/>`
        + ` <ellipse cx="${w * 0.92}" cy="${h * 0.58}" rx="${w * 0.05}" ry="${w * 0.03}" fill="#f0f0f0"/>`
        + ` <path d="M${w * 0.86},${h * 0.57} Q${w * 0.82},${h * 0.56} ${w * 0.79},${h * 0.57}" fill="none" stroke="#ff8040" stroke-width="1.2"/>`
        + ` <path d="M${w * 0.5},${h * 0.62} Q${w * 0.44},${h * 0.72} ${w * 0.42},${h * 0.85} Q${w * 0.46},${h * 0.87} ${w * 0.5},${h * 0.85} Q${w * 0.52},${h * 0.72} ${w * 0.56},${h * 0.65}Z" fill="#c8a870"/>`
        + ` <ellipse cx="${w * 0.52}" cy="${h * 0.56}" rx="${w * 0.1}" ry="${h * 0.12}" fill="#c8a870"/>`
        + ` <circle cx="${w * 0.52}" cy="${h * 0.44}" r="${w * 0.08}" fill="#f0c890"/>`
        + ` <rect x="${w * 0.35}" y="${h * 0.56}" width="${w * 0.07}" height="${h * 0.09}" rx="2" fill="#c9a84c"/>`
        + ` <path d="M${w * 0.35},${h * 0.62} Q${w * 0.25},${h * 0.7} ${w * 0.22},${h * 0.78}" fill="none" stroke="#4a9aba" stroke-width="1.5" opacity="0.8"/>`
        + ` <rect x="${w * 0.65}" y="${h * 0.58}" width="${w * 0.07}" height="${h * 0.09}" rx="2" fill="#c9a84c"/>`
        + ` <path d="M${w * 0.72},${h * 0.64} Q${w * 0.75},${h * 0.72} ${w * 0.72},${h * 0.82}" fill="none" stroke="#4a9aba" stroke-width="1.5" opacity="0.8"/>`
        // EXTRA: ripples in water, starlight rays, extra small stars
        + ` <ellipse cx="${w * 0.3}" cy="${h * 0.76}" rx="${w * 0.08}" ry="${h * 0.005}" fill="none" stroke="#4080c0" stroke-width="0.3" opacity="0.3"/>`
        + ` <ellipse cx="${w * 0.34}" cy="${h * 0.78}" rx="${w * 0.06}" ry="${h * 0.004}" fill="none" stroke="#4080c0" stroke-width="0.3" opacity="0.2"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.07}" x2="${w * 0.5}" y2="${h * 0.03}" stroke="#ffe040" stroke-width="0.5" opacity="0.4"/>`
        + ` <circle cx="${w * 0.1}" cy="${h * 0.18}" r="1" fill="#c8d8ff" opacity="0.4"/>`
        + ` <circle cx="${w * 0.92}" cy="${h * 0.35}" r="0.8" fill="#fff" opacity="0.3"/>`;
    return svgBase(w, h, c, 'XVII', 'THE STAR');
}

function drawMoon(w: number, h: number): string {
    const c = ` <circle cx="${w * 0.5}" cy="${h * 0.22}" r="${w * 0.2}" fill="#e8e0c0" opacity="0.18"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.22}" r="${w * 0.15}" fill="#f0e8c0" opacity="0.32"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.22}" r="${w * 0.11}" fill="#f8f0d0" opacity="0.5"/>`
        + ` <circle cx="${w * 0.57}" cy="${h * 0.2}" r="${w * 0.09}" fill="#0d0a1a" opacity="0.88"/>`
        + ` <circle cx="${w * 0.44}" cy="${h * 0.19}" r="${w * 0.02}" fill="#d0c8a0" opacity="0.3"/>`
        + ` <circle cx="${w * 0.48}" cy="${h * 0.25}" r="${w * 0.015}" fill="#d0c8a0" opacity="0.25"/>`
        + ` <rect x="${w * 0.08}" y="${h * 0.45}" width="${w * 0.14}" height="${h * 0.35}" rx="3" fill="#1a0f30" stroke="#c9a84c" stroke-width="0.8"/>`
        + ` <rect x="${w * 0.78}" y="${h * 0.45}" width="${w * 0.14}" height="${h * 0.35}" rx="3" fill="#1a0f30" stroke="#c9a84c" stroke-width="0.8"/>`
        + ` <rect x="${w * 0.06}" y="${h * 0.43}" width="${w * 0.18}" height="${h * 0.025}" rx="2" fill="#c9a84c" opacity="0.4"/>`
        + ` <rect x="${w * 0.76}" y="${h * 0.43}" width="${w * 0.18}" height="${h * 0.025}" rx="2" fill="#c9a84c" opacity="0.4"/>`
        + ` <rect x="${w * 0.12}" y="${h * 0.52}" width="${w * 0.06}" height="${h * 0.08}" rx="2" fill="#ffaa00" opacity="0.4"/>`
        + ` <rect x="${w * 0.82}" y="${h * 0.52}" width="${w * 0.06}" height="${h * 0.08}" rx="2" fill="#ffaa00" opacity="0.4"/>`
        + ` <path d="M${w * 0.22},${h * 0.8} Q${w * 0.5},${h * 0.75} ${w * 0.78},${h * 0.8}" fill="none" stroke="#c9a84c" stroke-width="1" opacity="0.35"/>`
        + ` <ellipse cx="${w * 0.5}" cy="${h * 0.72}" rx="${w * 0.26}" ry="${w * 0.1}" fill="#1a2850" opacity="0.9"/>`
        + ` <path d="M${w * 0.34},${h * 0.72} Q${w * 0.5},${h * 0.69} ${w * 0.66},${h * 0.72}" fill="none" stroke="#3060a0" stroke-width="1" opacity="0.5"/>`
        + ` <ellipse cx="${w * 0.5}" cy="${h * 0.73}" rx="${w * 0.06}" ry="${w * 0.04}" fill="#c04040" opacity="0.85"/>`
        + ` <line x1="${w * 0.44}" y1="${h * 0.73}" x2="${w * 0.38}" y2="${h * 0.7}" stroke="#c04040" stroke-width="1"/>`
        + ` <line x1="${w * 0.44}" y1="${h * 0.74}" x2="${w * 0.38}" y2="${h * 0.77}" stroke="#c04040" stroke-width="1"/>`
        + ` <line x1="${w * 0.56}" y1="${h * 0.73}" x2="${w * 0.62}" y2="${h * 0.7}" stroke="#c04040" stroke-width="1"/>`
        + ` <line x1="${w * 0.56}" y1="${h * 0.74}" x2="${w * 0.62}" y2="${h * 0.77}" stroke="#c04040" stroke-width="1"/>`
        + ` <path d="M${w * 0.14},${h * 0.6} Q${w * 0.1},${h * 0.53} ${w * 0.16},${h * 0.48} Q${w * 0.22},${h * 0.55} ${w * 0.25},${h * 0.53} Q${w * 0.3},${h * 0.6} ${w * 0.26},${h * 0.67}Z" fill="#5a5050"/>`
        + ` <circle cx="${w * 0.17}" cy="${h * 0.49}" r="${w * 0.016}" fill="#ffee40" opacity="0.7"/>`
        + ` <path d="M${w * 0.72},${h * 0.6} Q${w * 0.78},${h * 0.53} ${w * 0.8},${h * 0.48} Q${w * 0.86},${h * 0.55} ${w * 0.88},${h * 0.53} Q${w * 0.88},${h * 0.62} ${w * 0.82},${h * 0.67}Z" fill="#8a7060"/>`
        + ` <circle cx="${w * 0.82}" cy="${h * 0.5}" r="${w * 0.016}" fill="#2a2010"/>`
        + ` <ellipse cx="${w * 0.3}" cy="${h * 0.4}" rx="2" ry="3" fill="#c9a84c" opacity="0.55"/>`
        + ` <ellipse cx="${w * 0.7}" cy="${h * 0.38}" rx="2" ry="3" fill="#c9a84c" opacity="0.55"/>`
        + ` <ellipse cx="${w * 0.42}" cy="${h * 0.35}" rx="2" ry="3" fill="#c9a84c" opacity="0.45"/>`
        + ` <ellipse cx="${w * 0.6}" cy="${h * 0.42}" rx="2" ry="3" fill="#c9a84c" opacity="0.45"/>`
        + ` <ellipse cx="${w * 0.22}" cy="${h * 0.46}" rx="1.5" ry="2.5" fill="#c9a84c" opacity="0.35"/>`
        // EXTRA: owls, mushrooms, extra dewdrops, fog wisps
        + ` <circle cx="${w * 0.12}" cy="${h * 0.42}" r="${w * 0.008}" fill="#ffee40" opacity="0.3"/>`
        + ` <circle cx="${w * 0.13}" cy="${h * 0.42}" r="${w * 0.008}" fill="#ffee40" opacity="0.3"/>`
        + ` <circle cx="${w * 0.35}" cy="${h * 0.82}" r="${w * 0.01}" fill="#c08040" opacity="0.3"/>`
        + ` <ellipse cx="${w * 0.52}" cy="${h * 0.37}" rx="1.5" ry="2.5" fill="#c9a84c" opacity="0.3"/>`
        + ` <path d="M${w * 0.3},${h * 0.84} Q${w * 0.5},${h * 0.82} ${w * 0.7},${h * 0.85}" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="2"/>`;
    return svgBase(w, h, c, 'XVIII', 'THE MOON');
}

function drawSun(w: number, h: number): string {
    const c = ` <rect x="0" y="0" width="${w}" height="${h}" fill="#150b00"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.27}" r="${w * 0.24}" fill="#ffcc00" opacity="0.18"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.27}" r="${w * 0.18}" fill="#ffcc00" opacity="0.38"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.27}" r="${w * 0.13}" fill="#ffe840" opacity="0.9"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.05}" x2="${w * 0.5}" y2="${h * 0.12}" stroke="#ffd700" stroke-width="3.5" stroke-linecap="round"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.42}" x2="${w * 0.5}" y2="${h * 0.49}" stroke="#ffd700" stroke-width="3.5" stroke-linecap="round"/>`
        + ` <line x1="${w * 0.12}" y1="${h * 0.27}" x2="${w * 0.2}" y2="${h * 0.27}" stroke="#ffd700" stroke-width="3.5" stroke-linecap="round"/>`
        + ` <line x1="${w * 0.8}" y1="${h * 0.27}" x2="${w * 0.88}" y2="${h * 0.27}" stroke="#ffd700" stroke-width="3.5" stroke-linecap="round"/>`
        + ` <line x1="${w * 0.2}" y1="${h * 0.09}" x2="${w * 0.27}" y2="${h * 0.16}" stroke="#ffd700" stroke-width="2.5" stroke-linecap="round"/>`
        + ` <line x1="${w * 0.8}" y1="${h * 0.09}" x2="${w * 0.73}" y2="${h * 0.16}" stroke="#ffd700" stroke-width="2.5" stroke-linecap="round"/>`
        + ` <line x1="${w * 0.2}" y1="${h * 0.45}" x2="${w * 0.27}" y2="${h * 0.38}" stroke="#ffd700" stroke-width="2.5" stroke-linecap="round"/>`
        + ` <line x1="${w * 0.8}" y1="${h * 0.45}" x2="${w * 0.73}" y2="${h * 0.38}" stroke="#ffd700" stroke-width="2.5" stroke-linecap="round"/>`
        + ` <line x1="${w * 0.09}" y1="${h * 0.16}" x2="${w * 0.15}" y2="${h * 0.21}" stroke="#ffd700" stroke-width="2" stroke-linecap="round"/>`
        + ` <line x1="${w * 0.91}" y1="${h * 0.16}" x2="${w * 0.85}" y2="${h * 0.21}" stroke="#ffd700" stroke-width="2" stroke-linecap="round"/>`
        + ` <circle cx="${w * 0.44}" cy="${h * 0.25}" r="${w * 0.025}" fill="#fff8c0" opacity="0.9"/>`
        + ` <circle cx="${w * 0.56}" cy="${h * 0.25}" r="${w * 0.025}" fill="#fff8c0" opacity="0.9"/>`
        + ` <circle cx="${w * 0.44}" cy="${h * 0.25}" r="${w * 0.015}" fill="#8b4513"/>`
        + ` <circle cx="${w * 0.56}" cy="${h * 0.25}" r="${w * 0.015}" fill="#8b4513"/>`
        + ` <path d="M${w * 0.44},${h * 0.3} Q${w * 0.5},${h * 0.34} ${w * 0.56},${h * 0.3}" fill="none" stroke="#8b4513" stroke-width="1.2"/>`
        + ` <rect x="0" y="${h * 0.67}" width="${w}" height="${h * 0.15}" rx="2" fill="#2a1508" opacity="0.9"/>`
        + ` <line x1="${w * 0.2}" y1="${h * 0.67}" x2="${w * 0.2}" y2="${h * 0.55}" stroke="#4a8020" stroke-width="2.5"/>`
        + ` <circle cx="${w * 0.2}" cy="${h * 0.53}" r="${w * 0.06}" fill="#ffd700"/>`
        + ` <circle cx="${w * 0.2}" cy="${h * 0.53}" r="${w * 0.03}" fill="#8b4513"/>`
        + ` <line x1="${w * 0.4}" y1="${h * 0.67}" x2="${w * 0.4}" y2="${h * 0.58}" stroke="#4a8020" stroke-width="2.5"/>`
        + ` <circle cx="${w * 0.4}" cy="${h * 0.56}" r="${w * 0.055}" fill="#ffd700"/>`
        + ` <circle cx="${w * 0.4}" cy="${h * 0.56}" r="${w * 0.028}" fill="#8b4513"/>`
        + ` <line x1="${w * 0.62}" y1="${h * 0.67}" x2="${w * 0.62}" y2="${h * 0.54}" stroke="#4a8020" stroke-width="2.5"/>`
        + ` <circle cx="${w * 0.62}" cy="${h * 0.52}" r="${w * 0.055}" fill="#ffd700"/>`
        + ` <circle cx="${w * 0.62}" cy="${h * 0.52}" r="${w * 0.028}" fill="#8b4513"/>`
        + ` <line x1="${w * 0.82}" y1="${h * 0.67}" x2="${w * 0.82}" y2="${h * 0.57}" stroke="#4a8020" stroke-width="2.5"/>`
        + ` <circle cx="${w * 0.82}" cy="${h * 0.55}" r="${w * 0.05}" fill="#ffd700"/>`
        + ` <circle cx="${w * 0.82}" cy="${h * 0.55}" r="${w * 0.026}" fill="#8b4513"/>`
        + ` <ellipse cx="${w * 0.46}" cy="${h * 0.75}" rx="${w * 0.2}" ry="${w * 0.08}" fill="#f0ebe0"/>`
        + ` <ellipse cx="${w * 0.62}" cy="${h * 0.7}" rx="${w * 0.09}" ry="${w * 0.06}" fill="#f0ebe0"/>`
        + ` <ellipse cx="${w * 0.7}" cy="${h * 0.66}" rx="${w * 0.05}" ry="${w * 0.05}" fill="#f0ebe0"/>`
        + ` <circle cx="${w * 0.74}" cy="${h * 0.63}" r="${w * 0.035}" fill="#e0dbd0"/>`
        + ` <circle cx="${w * 0.46}" cy="${h * 0.66}" r="${w * 0.06}" fill="#f5c8a0"/>`
        + ` <ellipse cx="${w * 0.46}" cy="${h * 0.73}" rx="${w * 0.07}" ry="${w * 0.06}" fill="#ff5030"/>`
        + ` <line x1="${w * 0.46}" y1="${h * 0.7}" x2="${w * 0.58}" y2="${h * 0.62}" stroke="#ff5030" stroke-width="2"/>`
        + ` <circle cx="${w * 0.6}" cy="${h * 0.61}" r="${w * 0.03}" fill="#f5c8a0"/>`
        + ` <line x1="${w * 0.6}" y1="${h * 0.61}" x2="${w * 0.6}" y2="${h * 0.52}" stroke="#c0a060" stroke-width="1.5"/>`
        + ` <rect x="${w * 0.61}" y="${h * 0.5}" width="${w * 0.13}" height="${h * 0.1}" rx="1" fill="#ff3030" opacity="0.85"/>`
        // EXTRA: butterflies, extra sunflower details, sparkle particles
        + ` <path d="M${w * 0.3},${h * 0.6} Q${w * 0.32},${h * 0.58} ${w * 0.34},${h * 0.6} Q${w * 0.32},${h * 0.62} ${w * 0.3},${h * 0.6}Z" fill="#ffe040" opacity="0.3"/>`
        + ` <circle cx="${w * 0.2}" cy="${h * 0.53}" r="${w * 0.008}" fill="#fff" opacity="0.4"/>`
        + ` <circle cx="${w * 0.4}" cy="${h * 0.56}" r="${w * 0.008}" fill="#fff" opacity="0.35"/>`
        + ` <circle cx="${w * 0.62}" cy="${h * 0.52}" r="${w * 0.008}" fill="#fff" opacity="0.3"/>`
        + ` <circle cx="${w * 0.35}" cy="${h * 0.45}" r="0.8" fill="#ffd700" opacity="0.4"/>`;
    return svgBase(w, h, c, 'XIX', 'THE SUN');
}

function drawJudgement(w: number, h: number): string {
    const c = ` <rect x="0" y="0" width="${w}" height="${h}" fill="#080c18"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.15}" r="${w * 0.15}" fill="#ffcc40" opacity="0.2"/>`
        + ` <path d="M${w * 0.25},${h * 0.22} Q${w * 0.1},${h * 0.12} ${w * 0.04},${h * 0.26} Q${w * 0.12},${h * 0.32} ${w * 0.32},${h * 0.28}Z" fill="#f0f0ff" opacity="0.7"/>`
        + ` <path d="M${w * 0.75},${h * 0.22} Q${w * 0.9},${h * 0.12} ${w * 0.96},${h * 0.26} Q${w * 0.88},${h * 0.32} ${w * 0.68},${h * 0.28}Z" fill="#f0f0ff" opacity="0.7"/>`
        + ` <line x1="${w * 0.25}" y1="${h * 0.22}" x2="${w * 0.1}" y2="${h * 0.16}" stroke="#e0e0ff" stroke-width="0.8" opacity="0.5"/>`
        + ` <line x1="${w * 0.25}" y1="${h * 0.24}" x2="${w * 0.06}" y2="${h * 0.22}" stroke="#e0e0ff" stroke-width="0.8" opacity="0.5"/>`
        + ` <line x1="${w * 0.75}" y1="${h * 0.22}" x2="${w * 0.9}" y2="${h * 0.16}" stroke="#e0e0ff" stroke-width="0.8" opacity="0.5"/>`
        + ` <line x1="${w * 0.75}" y1="${h * 0.24}" x2="${w * 0.94}" y2="${h * 0.22}" stroke="#e0e0ff" stroke-width="0.8" opacity="0.5"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.19}" r="${w * 0.07}" fill="#f0c890"/>`
        + ` <path d="M${w * 0.43},${h * 0.25} Q${w * 0.5},${h * 0.32} ${w * 0.57},${h * 0.25}Z" fill="#ff8040" opacity="0.8"/>`
        + ` <line x1="${w * 0.5}" y1="${h * 0.22}" x2="${w * 0.5}" y2="${h * 0.3}" stroke="#c0a060" stroke-width="1.5"/>`
        + ` <rect x="${w * 0.42}" y="${h * 0.28}" width="${w * 0.16}" height="${h * 0.05}" rx="2" fill="#ffaa20" opacity="0.9"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.26}" r="${w * 0.015}" fill="#ffee80"/>`
        + ` <path d="M${w * 0.4},${h * 0.32} L${w * 0.4},${h * 0.28} L${w * 0.6},${h * 0.28} L${w * 0.6},${h * 0.32}" fill="none" stroke="#ffaa20" stroke-width="1"/>`
        + ` <rect x="0" y="${h * 0.72}" width="${w}" height="${h * 0.28}" fill="#1a1010" opacity="0.9"/>`
        + ` <ellipse cx="${w * 0.5}" cy="${h * 0.6}" rx="${w * 0.44}" ry="${w * 0.07}" fill="#1a2050" opacity="0.8"/>`
        + ` <path d="M${w * 0.46},${h * 0.53} Q${w * 0.42},${h * 0.56} ${w * 0.38},${h * 0.6} L${w * 0.36},${h * 0.72} L${w * 0.56},${h * 0.72} L${w * 0.54},${h * 0.6} Q${w * 0.5},${h * 0.55} ${w * 0.54},${h * 0.53}Z" fill="#c8c8e8" opacity="0.8"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.49}" r="${w * 0.07}" fill="#f0c890"/>`
        + ` <circle cx="${w * 0.47}" cy="${h * 0.48}" r="${w * 0.015}" fill="#3a2010"/>`
        + ` <circle cx="${w * 0.53}" cy="${h * 0.48}" r="${w * 0.015}" fill="#3a2010"/>`
        + ` <line x1="${w * 0.46}" y1="${h * 0.55}" x2="${w * 0.3}" y2="${h * 0.6}" stroke="#f0c890" stroke-width="2.5"/>`
        + ` <line x1="${w * 0.54}" y1="${h * 0.55}" x2="${w * 0.7}" y2="${h * 0.6}" stroke="#f0c890" stroke-width="2.5"/>`
        + ` <circle cx="${w * 0.22}" cy="${h * 0.65}" r="${w * 0.06}" fill="#f0c890"/>`
        + ` <path d="M${w * 0.16},${h * 0.7} Q${w * 0.22},${h * 0.68} ${w * 0.28},${h * 0.7} L${w * 0.28},${h * 0.8} L${w * 0.16},${h * 0.8}Z" fill="#6080c0" opacity="0.8"/>`
        + ` <circle cx="${w * 0.78}" cy="${h * 0.65}" r="${w * 0.06}" fill="#f0c890"/>`
        + ` <path d="M${w * 0.72},${h * 0.7} Q${w * 0.78},${h * 0.68} ${w * 0.84},${h * 0.7} L${w * 0.84},${h * 0.8} L${w * 0.72},${h * 0.8}Z" fill="#c06030" opacity="0.8"/>`
        + ` <ellipse cx="${w * 0.22}" cy="${h * 0.62}" rx="${w * 0.08}" ry="${w * 0.03}" fill="#c9a84c" opacity="0.4"/>`
        + ` <ellipse cx="${w * 0.78}" cy="${h * 0.62}" rx="${w * 0.08}" ry="${w * 0.03}" fill="#c9a84c" opacity="0.4"/>`
        + ` <line x1="${w * 0.38}" y1="${h * 0.62}" x2="${w * 0.3}" y2="${h * 0.52}" stroke="#ffcc40" stroke-width="1" opacity="0.5"/>`
        + ` <line x1="${w * 0.62}" y1="${h * 0.62}" x2="${w * 0.7}" y2="${h * 0.52}" stroke="#ffcc40" stroke-width="1" opacity="0.5"/>`
        // EXTRA: dove, extra cloud layers, trumpet rays
        + ` <path d="M${w * 0.5},${h * 0.08} Q${w * 0.52},${h * 0.06} ${w * 0.55},${h * 0.08} Q${w * 0.53},${h * 0.1} ${w * 0.5},${h * 0.08}Z" fill="#f0f0ff" opacity="0.5"/>`
        + ` <ellipse cx="${w * 0.3}" cy="${h * 0.35}" rx="${w * 0.12}" ry="${h * 0.02}" fill="#f0f0ff" opacity="0.08"/>`
        + ` <ellipse cx="${w * 0.7}" cy="${h * 0.38}" rx="${w * 0.1}" ry="${h * 0.015}" fill="#f0f0ff" opacity="0.06"/>`
        + ` <line x1="${w * 0.55}" y1="${h * 0.3}" x2="${w * 0.65}" y2="${h * 0.35}" stroke="#ffaa20" stroke-width="0.4" opacity="0.3"/>`
        + ` <line x1="${w * 0.45}" y1="${h * 0.3}" x2="${w * 0.35}" y2="${h * 0.35}" stroke="#ffaa20" stroke-width="0.4" opacity="0.3"/>`;
    return svgBase(w, h, c, 'XX', 'JUDGEMENT');
}

function drawWorld(w: number, h: number): string {
    const c = ` <ellipse cx="${w * 0.5}" cy="${h * 0.5}" rx="${w * 0.36}" ry="${h * 0.42}" fill="none" stroke="#c9a84c" stroke-width="2.5"/>`
        + ` <ellipse cx="${w * 0.5}" cy="${h * 0.5}" rx="${w * 0.33}" ry="${h * 0.39}" fill="none" stroke="#8a6820" stroke-width="0.8" opacity="0.5"/>`
        + ` <path d="M${w * 0.22},${h * 0.12} Q${w * 0.3},${h * 0.06} ${w * 0.38},${h * 0.1} Q${w * 0.5},${h * 0.06} ${w * 0.62},${h * 0.1} Q${w * 0.7},${h * 0.06} ${w * 0.78},${h * 0.12} Q${w * 0.82},${h * 0.2} ${w * 0.78},${h * 0.24} Q${w * 0.5},${h * 0.18} ${w * 0.22},${h * 0.24} Q${w * 0.18},${h * 0.2} ${w * 0.22},${h * 0.12}Z" fill="#6a9830" opacity="0.7"/>`
        + ` <path d="M${w * 0.22},${h * 0.76} Q${w * 0.3},${h * 0.82} ${w * 0.38},${h * 0.88} Q${w * 0.5},${h * 0.92} ${w * 0.62},${h * 0.88} Q${w * 0.7},${h * 0.82} ${w * 0.78},${h * 0.76} Q${w * 0.82},${h * 0.82} ${w * 0.78},${h * 0.88} Q${w * 0.5},${h * 0.95} ${w * 0.22},${h * 0.88} Q${w * 0.18},${h * 0.82} ${w * 0.22},${h * 0.76}Z" fill="#6a9830" opacity="0.7"/>`
        + ` <text x="${w * 0.08}" y="${h * 0.22}" font-family="serif" font-size="${w * 0.08}" fill="#c9a84c" text-anchor="middle" opacity="0.75">\u2645</text>`
        + ` <text x="${w * 0.92}" y="${h * 0.22}" font-family="serif" font-size="${w * 0.08}" fill="#c9a84c" text-anchor="middle" opacity="0.75">\u264C</text>`
        + ` <text x="${w * 0.08}" y="${h * 0.82}" font-family="serif" font-size="${w * 0.08}" fill="#c9a84c" text-anchor="middle" opacity="0.75">\u2649</text>`
        + ` <text x="${w * 0.92}" y="${h * 0.82}" font-family="serif" font-size="${w * 0.08}" fill="#c9a84c" text-anchor="middle" opacity="0.75">\u2652</text>`
        + ` <ellipse cx="${w * 0.5}" cy="${h * 0.5}" rx="${w * 0.12}" ry="${h * 0.16}" fill="#f0c890" opacity="0.9"/>`
        + ` <circle cx="${w * 0.5}" cy="${h * 0.33}" r="${w * 0.08}" fill="#f0c890"/>`
        + ` <circle cx="${w * 0.47}" cy="${h * 0.32}" r="${w * 0.015}" fill="#3a2010"/>`
        + ` <circle cx="${w * 0.53}" cy="${h * 0.32}" r="${w * 0.015}" fill="#3a2010"/>`
        + ` <path d="M${w * 0.47},${h * 0.36} Q${w * 0.5},${h * 0.38} ${w * 0.53},${h * 0.36}" fill="none" stroke="#c07060" stroke-width="0.8"/>`
        + ` <path d="M${w * 0.38},${h * 0.4} Q${w * 0.26},${h * 0.44} ${w * 0.28},${h * 0.58} Q${w * 0.3},${h * 0.66} ${w * 0.38},${h * 0.68}Z" fill="#6040a0" opacity="0.7"/>`
        + ` <path d="M${w * 0.62},${h * 0.4} Q${w * 0.74},${h * 0.44} ${w * 0.72},${h * 0.58} Q${w * 0.7},${h * 0.66} ${w * 0.62},${h * 0.68}Z" fill="#6040a0" opacity="0.7"/>`
        + ` <line x1="${w * 0.4}" y1="${h * 0.42}" x2="${w * 0.3}" y2="${h * 0.38}" stroke="#f0c890" stroke-width="2.5"/>`
        + ` <line x1="${w * 0.32}" y1="${h * 0.37}" x2="${w * 0.36}" y2="${h * 0.28}" stroke="#c0a060" stroke-width="1.5"/>`
        + ` <line x1="${w * 0.36}" y1="${h * 0.28}" x2="${w * 0.32}" y2="${h * 0.22}" stroke="#c9a84c" stroke-width="1.5"/>`
        + ` <line x1="${w * 0.6}" y1="${h * 0.42}" x2="${w * 0.7}" y2="${h * 0.38}" stroke="#f0c890" stroke-width="2.5"/>`
        + ` <line x1="${w * 0.68}" y1="${h * 0.37}" x2="${w * 0.62}" y2="${h * 0.3}" stroke="#c0a060" stroke-width="1.5"/>`
        + ` <circle cx="${w * 0.34}" cy="${h * 0.56}" r="${w * 0.015}" fill="#c9a84c" opacity="0.6"/>`
        + ` <circle cx="${w * 0.66}" cy="${h * 0.56}" r="${w * 0.015}" fill="#c9a84c" opacity="0.6"/>`
        // EXTRA: wreath flower details, ribbon movement lines, sparkles
        + ` <circle cx="${w * 0.3}" cy="${h * 0.14}" r="${w * 0.01}" fill="#ff8080" opacity="0.4"/>`
        + ` <circle cx="${w * 0.7}" cy="${h * 0.14}" r="${w * 0.01}" fill="#ff8080" opacity="0.4"/>`
        + ` <circle cx="${w * 0.3}" cy="${h * 0.84}" r="${w * 0.01}" fill="#ff8080" opacity="0.4"/>`
        + ` <circle cx="${w * 0.7}" cy="${h * 0.84}" r="${w * 0.01}" fill="#ff8080" opacity="0.4"/>`
        + ` <path d="M${w * 0.28},${h * 0.56} Q${w * 0.24},${h * 0.58} ${w * 0.26},${h * 0.62}" fill="none" stroke="#6040a0" stroke-width="0.5" opacity="0.3"/>`;
    return svgBase(w, h, c, 'XXI', 'THE WORLD');
}

// ══════════════════════════════════════════════════════════
// MINOR ARCANA — suit symbols & card rendering
// ══════════════════════════════════════════════════════════

function drawSuitSymbol(cx: number, cy: number, suit: string, size: number): string {
    const sc = SUIT_CONFIG[suit];
    if (suit === 'Wands') {
        return `<line x1="${cx}" y1="${cy - size * 0.7}" x2="${cx}" y2="${cy + size * 0.7}" stroke="${sc.color}" stroke-width="${size * 0.18}" stroke-linecap="round"/>`
            + `<circle cx="${cx}" cy="${cy - size * 0.7}" r="${size * 0.15}" fill="#ff8040"/>`
            + `<circle cx="${cx}" cy="${cy - size * 0.7}" r="${size * 0.08}" fill="#ffe080"/>`;
    }
    if (suit === 'Cups') {
        return `<path d="M${cx - size * 0.35},${cy - size * 0.4} L${cx - size * 0.25},${cy + size * 0.35} Q${cx},${cy + size * 0.65} ${cx + size * 0.25},${cy + size * 0.35} L${cx + size * 0.35},${cy - size * 0.4}Z" fill="${sc.color}" opacity="0.85"/>`
            + `<ellipse cx="${cx}" cy="${cy - size * 0.4}" rx="${size * 0.35}" ry="${size * 0.12}" fill="${sc.colorDim}"/>`
            + `<ellipse cx="${cx}" cy="${cy - size * 0.3}" rx="${size * 0.18}" ry="${size * 0.06}" fill="#80c0ff" opacity="0.5"/>`;
    }
    if (suit === 'Swords') {
        return `<line x1="${cx}" y1="${cy - size * 0.7}" x2="${cx}" y2="${cy + size * 0.5}" stroke="${sc.color}" stroke-width="${size * 0.1}" stroke-linecap="round"/>`
            + `<polygon points="${cx},${cy - size * 0.7} ${cx - size * 0.08},${cy - size * 0.55} ${cx + size * 0.08},${cy - size * 0.55}" fill="#e0e8f0"/>`
            + `<line x1="${cx - size * 0.25}" y1="${cy - size * 0.15}" x2="${cx + size * 0.25}" y2="${cy - size * 0.15}" stroke="${sc.color}" stroke-width="${size * 0.08}" stroke-linecap="round"/>`;
    }
    // Pentacles
    return `<circle cx="${cx}" cy="${cy}" r="${size * 0.45}" fill="none" stroke="${sc.color}" stroke-width="${size * 0.08}"/>`
        + `<circle cx="${cx}" cy="${cy}" r="${size * 0.35}" fill="${sc.color}" opacity="0.2"/>`
        + `<text x="${cx}" y="${cy + size * 0.15}" font-family="serif" font-size="${size * 0.5}" fill="${sc.color}" text-anchor="middle">\u2605</text>`;
}

function drawMinorCard(w: number, h: number, suit: string, value: number, displayName: string): string {
    const sc = SUIT_CONFIG[suit];
    const valueLabels: Record<number, string> = { 1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'Pg', 12: 'Kn', 13: 'Q', 14: 'K' };
    const valText = valueLabels[value] || String(value);

    const defs = `<defs><radialGradient id="mbg_${suit}_${value}" cx="50%" cy="35%">`
        + `<stop offset="0%" stop-color="${sc.bgGrad[0]}"/>`
        + `<stop offset="100%" stop-color="${sc.bgGrad[1]}"/>`
        + `</radialGradient></defs>`;

    let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`
        + defs
        + `<rect width="${w}" height="${h}" fill="url(#mbg_${suit}_${value})"/>`;

    // Borders
    svg += `<rect x="5" y="5" width="${w - 10}" height="${h - 10}" fill="none" stroke="${sc.color}" stroke-width="1" rx="7" opacity="0.35"/>`;
    svg += `<rect x="9" y="9" width="${w - 18}" height="${h - 18}" fill="none" stroke="${sc.color}" stroke-width="0.5" rx="4" opacity="0.15"/>`;

    // Corner value labels
    svg += `<text x="16" y="26" font-family="serif" font-size="${w * 0.1}" fill="${sc.color}" font-weight="bold">${valText}</text>`;
    svg += `<text x="${w - 16}" y="${h - 14}" font-family="serif" font-size="${w * 0.1}" fill="${sc.color}" text-anchor="end" font-weight="bold" transform="rotate(180,${w - 16},${h - 18})">${valText}</text>`;

    // Element emoji and label
    svg += `<text x="${w - 18}" y="24" font-family="sans-serif" font-size="${w * 0.08}" text-anchor="end">${sc.element}</text>`;
    svg += `<text x="18" y="${h - 14}" font-family="serif" font-size="${w * 0.055}" fill="${sc.colorDim}" opacity="0.7">${sc.elemName}</text>`;

    // Small suit symbol under top-left value
    svg += drawSuitSymbol(18, 38, suit, w * 0.08);

    if (value >= 1 && value <= 10) {
        // --- PIP CARDS ---
        const cx = w / 2, cy = h / 2;
        if (value === 1) {
            svg += drawSuitSymbol(cx, cy - 10, suit, w * 0.35);
            for (let ri = 0; ri < 8; ri++) {
                const angle = ri * Math.PI / 4;
                const x1 = cx + Math.cos(angle) * (w * 0.22);
                const y1 = (cy - 10) + Math.sin(angle) * (w * 0.22);
                const x2 = cx + Math.cos(angle) * (w * 0.32);
                const y2 = (cy - 10) + Math.sin(angle) * (w * 0.32);
                svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${sc.color}" stroke-width="0.8" opacity="0.3"/>`;
            }
        } else {
            const pipSize = w * 0.12;
            let positions: number[][] = [];
            const midX = w / 2, topY = h * 0.18, botY = h * 0.73, midY = h * 0.455;
            const leftX = w * 0.3, rightX = w * 0.7;
            if (value === 2) positions = [[midX, topY + 15], [midX, botY - 15]];
            else if (value === 3) positions = [[midX, topY + 15], [midX, midY], [midX, botY - 15]];
            else if (value === 4) positions = [[leftX, topY + 15], [rightX, topY + 15], [leftX, botY - 15], [rightX, botY - 15]];
            else if (value === 5) positions = [[leftX, topY + 15], [rightX, topY + 15], [midX, midY], [leftX, botY - 15], [rightX, botY - 15]];
            else if (value === 6) positions = [[leftX, topY + 15], [rightX, topY + 15], [leftX, midY], [rightX, midY], [leftX, botY - 15], [rightX, botY - 15]];
            else if (value === 7) positions = [[leftX, topY + 15], [rightX, topY + 15], [leftX, midY], [midX, h * 0.35], [rightX, midY], [leftX, botY - 15], [rightX, botY - 15]];
            else if (value === 8) positions = [[leftX, topY + 15], [rightX, topY + 15], [leftX, h * 0.35], [rightX, h * 0.35], [leftX, h * 0.56], [rightX, h * 0.56], [leftX, botY - 15], [rightX, botY - 15]];
            else if (value === 9) positions = [[leftX, topY + 15], [rightX, topY + 15], [leftX, h * 0.32], [rightX, h * 0.32], [midX, midY], [leftX, h * 0.58], [rightX, h * 0.58], [leftX, botY - 15], [rightX, botY - 15]];
            else if (value === 10) positions = [[leftX, topY + 15], [rightX, topY + 15], [leftX, h * 0.3], [rightX, h * 0.3], [midX, h * 0.37], [midX, h * 0.53], [leftX, h * 0.6], [rightX, h * 0.6], [leftX, botY - 15], [rightX, botY - 15]];
            for (let pi = 0; pi < positions.length; pi++) {
                svg += drawSuitSymbol(positions[pi][0], positions[pi][1], suit, pipSize);
            }
        }
    } else {
        // --- COURT CARDS ---
        const cx = w / 2;
        svg += `<g opacity="0.12">${drawSuitSymbol(cx, h * 0.46, suit, w * 0.5)}</g>`;
        // Head
        svg += `<circle cx="${cx}" cy="${h * 0.28}" r="${w * 0.1}" fill="${sc.color}" opacity="0.7"/>`;
        svg += `<circle cx="${cx}" cy="${h * 0.28}" r="${w * 0.08}" fill="#f0c890" opacity="0.9"/>`;
        svg += `<circle cx="${cx - w * 0.025}" cy="${h * 0.275}" r="${w * 0.012}" fill="#2a1810"/>`;
        svg += `<circle cx="${cx + w * 0.025}" cy="${h * 0.275}" r="${w * 0.012}" fill="#2a1810"/>`;

        if (value === 11) {
            // PAGE
            svg += `<rect x="${cx - w * 0.12}" y="${h * 0.36}" width="${w * 0.24}" height="${h * 0.26}" rx="4" fill="${sc.color}" opacity="0.6"/>`;
            svg += `<rect x="${cx - w * 0.1}" y="${h * 0.38}" width="${w * 0.2}" height="${h * 0.22}" rx="3" fill="${sc.colorDim}" opacity="0.4"/>`;
            svg += drawSuitSymbol(cx, h * 0.52, suit, w * 0.14);
        } else if (value === 12) {
            // KNIGHT
            svg += `<rect x="${cx - w * 0.14}" y="${h * 0.35}" width="${w * 0.28}" height="${h * 0.2}" rx="3" fill="${sc.colorDim}" opacity="0.8"/>`;
            svg += `<rect x="${cx - w * 0.08}" y="${h * 0.38}" width="${w * 0.16}" height="${h * 0.14}" rx="2" fill="#1a1a2a" stroke="${sc.color}" stroke-width="1"/>`;
            svg += drawSuitSymbol(cx, h * 0.45, suit, w * 0.1);
            svg += `<ellipse cx="${cx}" cy="${h * 0.63}" rx="${w * 0.18}" ry="${w * 0.1}" fill="${sc.colorDim}" opacity="0.7"/>`;
            svg += `<ellipse cx="${cx - w * 0.14}" cy="${h * 0.6}" rx="${w * 0.05}" ry="${w * 0.06}" fill="${sc.colorDim}" opacity="0.6"/>`;
            svg += `<line x1="${cx - w * 0.1}" y1="${h * 0.7}" x2="${cx - w * 0.12}" y2="${h * 0.8}" stroke="${sc.colorDim}" stroke-width="3"/>`;
            svg += `<line x1="${cx + w * 0.1}" y1="${h * 0.7}" x2="${cx + w * 0.12}" y2="${h * 0.8}" stroke="${sc.colorDim}" stroke-width="3"/>`;
        } else if (value === 13) {
            // QUEEN
            svg += `<rect x="${cx - w * 0.08}" y="${h * 0.2}" width="${w * 0.16}" height="${h * 0.035}" rx="2" fill="#c9a84c"/>`;
            svg += `<polygon points="${cx - w * 0.06},${h * 0.2} ${cx},${h * 0.17} ${cx + w * 0.06},${h * 0.2}" fill="#c9a84c"/>`;
            svg += `<path d="M${cx - w * 0.14},${h * 0.36} Q${cx},${h * 0.33} ${cx + w * 0.14},${h * 0.36} L${cx + w * 0.18},${h * 0.72} L${cx - w * 0.18},${h * 0.72}Z" fill="${sc.color}" opacity="0.6"/>`;
            svg += drawSuitSymbol(cx, h * 0.55, suit, w * 0.13);
        } else if (value === 14) {
            // KING
            svg += `<rect x="${cx - w * 0.1}" y="${h * 0.19}" width="${w * 0.2}" height="${h * 0.04}" rx="2" fill="#c9a84c"/>`;
            svg += `<polygon points="${cx - w * 0.08},${h * 0.19} ${cx - w * 0.04},${h * 0.15} ${cx},${h * 0.19} ${cx + w * 0.04},${h * 0.15} ${cx + w * 0.08},${h * 0.19}" fill="#c9a84c"/>`;
            svg += `<circle cx="${cx}" cy="${h * 0.15}" r="${w * 0.02}" fill="#ff4040"/>`;
            svg += `<rect x="${cx - w * 0.2}" y="${h * 0.25}" width="${w * 0.4}" height="${h * 0.5}" rx="5" fill="${sc.colorDim}" opacity="0.4"/>`;
            svg += `<path d="M${cx - w * 0.15},${h * 0.36} L${cx + w * 0.15},${h * 0.36} L${cx + w * 0.2},${h * 0.72} L${cx - w * 0.2},${h * 0.72}Z" fill="${sc.color}" opacity="0.55"/>`;
            svg += drawSuitSymbol(cx, h * 0.55, suit, w * 0.14);
        }
    }

    // Name bar
    svg += `<rect x="0" y="${h - 28}" width="${w}" height="28" fill="rgba(0,0,0,0.7)"/>`;
    svg += `<text x="${w / 2}" y="${h - 10}" font-family="serif" font-size="${w * 0.06}" fill="${sc.color}" text-anchor="middle" font-weight="bold" letter-spacing="0.5">${displayName.toUpperCase()}</text>`;
    svg += `</svg>`;
    return svg;
}

// ══════════════════════════════════════════════════════════
// CARD ART LOOKUP
// ══════════════════════════════════════════════════════════

const MAJOR_DRAW_MAP: Record<string, (w: number, h: number) => string> = {
    'The Fool': drawFool,
    'The Magician': drawMagician,
    'The High Priestess': drawHighPriestess,
    'The Empress': drawEmpress,
    'The Emperor': drawEmperor,
    'The Hierophant': drawHierophant,
    'The Lovers': drawLovers,
    'The Chariot': drawChariot,
    'Strength': drawStrength,
    'The Hermit': drawHermit,
    'Wheel of Fortune': drawWheel,
    'Justice': drawJustice,
    'The Hanged Man': drawHangedMan,
    'Death': drawDeath,
    'Temperance': drawTemperance,
    'The Devil': drawDevil,
    'The Tower': drawTower,
    'The Star': drawStar,
    'The Moon': drawMoon,
    'The Sun': drawSun,
    'Judgement': drawJudgement,
    'The World': drawWorld,
};

const VALUE_NAME_MAP: Record<string, number> = {
    'Ace': 1, 'Two': 2, 'Three': 3, 'Four': 4, 'Five': 5,
    'Six': 6, 'Seven': 7, 'Eight': 8, 'Nine': 9, 'Ten': 10,
    'Page': 11, 'Knight': 12, 'Queen': 13, 'King': 14,
};

export function getCardArt(cardName: string, w: number, h: number): string | null {
    // Check Major Arcana
    const majorDraw = MAJOR_DRAW_MAP[cardName];
    if (majorDraw) {
        return majorDraw(w, h);
    }

    // Parse "Rank of Suit" for minor arcana
    const match = cardName.match(/^(\w+)\s+of\s+(\w+)$/);
    if (match) {
        const rank = match[1];
        const suit = match[2];
        const value = VALUE_NAME_MAP[rank];
        if (value && SUIT_CONFIG[suit]) {
            return drawMinorCard(w, h, suit, value, cardName);
        }
    }

    return null;
}
