/**
 * Cat Tarot card SVG artwork — feline-themed card illustrations.
 * Every card features cats as the main characters with warm vintage palette.
 *
 * Placeholder — full implementation pending.
 * Falls back to classic deck structure.
 */

// ══════════════════════════════════════════════════════════
// SUIT CONFIGURATION (Cat-themed)
// ══════════════════════════════════════════════════════════

const SUIT_CONFIG: Record<string, { color: string; colorDim: string; element: string; elemName: string; bgGrad: [string, string] }> = {
    Wands:     { color: '#c87830', colorDim: '#8a5018', element: '🧶', elemName: 'Fire', bgGrad: ['#2a1808', '#1a0c04'] },
    Cups:      { color: '#5898b8', colorDim: '#386878', element: '🐟', elemName: 'Water', bgGrad: ['#0c1828', '#060c18'] },
    Swords:    { color: '#a0a8b8', colorDim: '#606870', element: '🐾', elemName: 'Air', bgGrad: ['#181820', '#0c0c14'] },
    Pentacles: { color: '#c0a030', colorDim: '#806820', element: '🪙', elemName: 'Earth', bgGrad: ['#1a1808', '#100c04'] },
};

// ══════════════════════════════════════════════════════════
// CAT DRAWING HELPERS
// ══════════════════════════════════════════════════════════

type CatColor = '#2a2028' | '#808070' | '#c89060' | '#f0e8d8' | '#a07048';

function catHead(cx: number, cy: number, size: number, color: CatColor, eyeColor = '#ffe060'): string {
    const s = size;
    return ''
        // Head shape
        + `<ellipse cx="${cx}" cy="${cy}" rx="${s * 0.42}" ry="${s * 0.38}" fill="${color}"/>`
        // Left ear
        + `<polygon points="${cx - s * 0.35},${cy - s * 0.2} ${cx - s * 0.22},${cy - s * 0.55} ${cx - s * 0.08},${cy - s * 0.2}" fill="${color}"/>`
        + `<polygon points="${cx - s * 0.3},${cy - s * 0.22} ${cx - s * 0.22},${cy - s * 0.45} ${cx - s * 0.12},${cy - s * 0.22}" fill="#d0a080" opacity="0.4"/>`
        // Right ear
        + `<polygon points="${cx + s * 0.08},${cy - s * 0.2} ${cx + s * 0.22},${cy - s * 0.55} ${cx + s * 0.35},${cy - s * 0.2}" fill="${color}"/>`
        + `<polygon points="${cx + s * 0.12},${cy - s * 0.22} ${cx + s * 0.22},${cy - s * 0.45} ${cx + s * 0.3},${cy - s * 0.22}" fill="#d0a080" opacity="0.4"/>`
        // Eyes
        + `<ellipse cx="${cx - s * 0.12}" cy="${cy}" rx="${s * 0.065}" ry="${s * 0.075}" fill="${eyeColor}"/>`
        + `<ellipse cx="${cx + s * 0.12}" cy="${cy}" rx="${s * 0.065}" ry="${s * 0.075}" fill="${eyeColor}"/>`
        + `<ellipse cx="${cx - s * 0.12}" cy="${cy}" rx="${s * 0.03}" ry="${s * 0.065}" fill="#1a1018"/>`
        + `<ellipse cx="${cx + s * 0.12}" cy="${cy}" rx="${s * 0.03}" ry="${s * 0.065}" fill="#1a1018"/>`
        // Nose
        + `<polygon points="${cx},${cy + s * 0.08} ${cx - s * 0.04},${cy + s * 0.14} ${cx + s * 0.04},${cy + s * 0.14}" fill="#d08070"/>`
        // Mouth
        + `<path d="M${cx},${cy + s * 0.14} Q${cx - s * 0.06},${cy + s * 0.2} ${cx - s * 0.1},${cy + s * 0.17}" fill="none" stroke="#d08070" stroke-width="0.8"/>`
        + `<path d="M${cx},${cy + s * 0.14} Q${cx + s * 0.06},${cy + s * 0.2} ${cx + s * 0.1},${cy + s * 0.17}" fill="none" stroke="#d08070" stroke-width="0.8"/>`
        // Whiskers
        + `<line x1="${cx - s * 0.08}" y1="${cy + s * 0.1}" x2="${cx - s * 0.45}" y2="${cy + s * 0.05}" stroke="${color === '#2a2028' ? '#707060' : '#8a7860'}" stroke-width="0.6" opacity="0.7"/>`
        + `<line x1="${cx - s * 0.08}" y1="${cy + s * 0.13}" x2="${cx - s * 0.45}" y2="${cy + s * 0.15}" stroke="${color === '#2a2028' ? '#707060' : '#8a7860'}" stroke-width="0.6" opacity="0.7"/>`
        + `<line x1="${cx + s * 0.08}" y1="${cy + s * 0.1}" x2="${cx + s * 0.45}" y2="${cy + s * 0.05}" stroke="${color === '#2a2028' ? '#707060' : '#8a7860'}" stroke-width="0.6" opacity="0.7"/>`
        + `<line x1="${cx + s * 0.08}" y1="${cy + s * 0.13}" x2="${cx + s * 0.45}" y2="${cy + s * 0.15}" stroke="${color === '#2a2028' ? '#707060' : '#8a7860'}" stroke-width="0.6" opacity="0.7"/>`;
}

function catSitting(cx: number, cy: number, size: number, color: CatColor): string {
    const s = size;
    return ''
        // Body
        + `<ellipse cx="${cx}" cy="${cy + s * 0.2}" rx="${s * 0.32}" ry="${s * 0.4}" fill="${color}"/>`
        // Front paws
        + `<ellipse cx="${cx - s * 0.15}" cy="${cy + s * 0.55}" rx="${s * 0.08}" ry="${s * 0.06}" fill="${color}"/>`
        + `<ellipse cx="${cx + s * 0.15}" cy="${cy + s * 0.55}" rx="${s * 0.08}" ry="${s * 0.06}" fill="${color}"/>`
        // Paw beans
        + `<circle cx="${cx - s * 0.15}" cy="${cy + s * 0.57}" r="${s * 0.02}" fill="#d0a080" opacity="0.5"/>`
        + `<circle cx="${cx + s * 0.15}" cy="${cy + s * 0.57}" r="${s * 0.02}" fill="#d0a080" opacity="0.5"/>`
        // Tail
        + `<path d="M${cx + s * 0.25},${cy + s * 0.4} Q${cx + s * 0.5},${cy + s * 0.15} ${cx + s * 0.4},${cy - s * 0.05}" fill="none" stroke="${color}" stroke-width="${s * 0.08}" stroke-linecap="round"/>`
        // Head
        + catHead(cx, cy - s * 0.2, s * 0.6, color);
}

function pawPrint(cx: number, cy: number, size: number, color: string, opacity = 0.3): string {
    const s = size;
    return ''
        + `<ellipse cx="${cx}" cy="${cy + s * 0.15}" rx="${s * 0.25}" ry="${s * 0.2}" fill="${color}" opacity="${opacity}"/>`
        + `<circle cx="${cx - s * 0.18}" cy="${cy - s * 0.1}" r="${s * 0.09}" fill="${color}" opacity="${opacity}"/>`
        + `<circle cx="${cx - s * 0.05}" cy="${cy - s * 0.18}" r="${s * 0.09}" fill="${color}" opacity="${opacity}"/>`
        + `<circle cx="${cx + s * 0.08}" cy="${cy - s * 0.18}" r="${s * 0.09}" fill="${color}" opacity="${opacity}"/>`
        + `<circle cx="${cx + s * 0.2}" cy="${cy - s * 0.1}" r="${s * 0.09}" fill="${color}" opacity="${opacity}"/>`;
}

// ══════════════════════════════════════════════════════════
// CARD BACK (Cat version)
// ══════════════════════════════════════════════════════════

export function cardBackSvg(w: number, h: number): string {
    const cx = w / 2, cy = h / 2;
    // Fish-bone pattern
    let fishBones = '';
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 8; j++) {
            const x = i * (w / 4) + w / 8;
            const y = j * (h / 7) + h / 14;
            fishBones += `<line x1="${x - 6}" y1="${y - 3}" x2="${x}" y2="${y}" stroke="rgba(200,168,75,0.12)" stroke-width="0.5"/>`
                + `<line x1="${x - 6}" y1="${y + 3}" x2="${x}" y2="${y}" stroke="rgba(200,168,75,0.12)" stroke-width="0.5"/>`
                + `<line x1="${x}" y1="${y}" x2="${x + 6}" y2="${y - 3}" stroke="rgba(200,168,75,0.12)" stroke-width="0.5"/>`
                + `<line x1="${x}" y1="${y}" x2="${x + 6}" y2="${y + 3}" stroke="rgba(200,168,75,0.12)" stroke-width="0.5"/>`
                + `<line x1="${x - 8}" y1="${y}" x2="${x + 8}" y2="${y}" stroke="rgba(200,168,75,0.15)" stroke-width="0.6"/>`;
        }
    }

    return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`
        + `<rect width="${w}" height="${h}" fill="#1a1420"/>`
        + `<rect x="8" y="8" width="${w - 16}" height="${h - 16}" fill="none" stroke="rgba(200,168,75,0.4)" stroke-width="0.8" rx="5"/>`
        + `<rect x="14" y="14" width="${w - 28}" height="${h - 28}" fill="none" stroke="rgba(200,168,75,0.2)" stroke-width="0.6" rx="3"/>`
        + fishBones
        // Corner paw prints
        + pawPrint(25, 25, 12, 'rgba(200,168,75,0.25)')
        + pawPrint(w - 25, 25, 12, 'rgba(200,168,75,0.25)')
        + pawPrint(25, h - 25, 12, 'rgba(200,168,75,0.25)')
        + pawPrint(w - 25, h - 25, 12, 'rgba(200,168,75,0.25)')
        // Center: cat in crescent moon
        + `<path d="M${cx + 18},${cy - 25} A25,25 0 1,0 ${cx + 18},${cy + 25} A20,20 0 0,1 ${cx + 18},${cy - 25}" fill="rgba(200,168,75,0.15)" stroke="rgba(200,168,75,0.35)" stroke-width="0.8"/>`
        + catSitting(cx - 5, cy - 5, 30, '#2a2028' as CatColor)
        // Text
        + `<text x="${cx}" y="30" font-family="serif" font-size="11" fill="rgba(200,168,75,0.5)" text-anchor="middle" letter-spacing="3">CAT TAROT</text>`
        + `<text x="${cx}" y="${h - 16}" font-family="serif" font-size="11" fill="rgba(200,168,75,0.5)" text-anchor="middle" letter-spacing="3">MEOW</text>`
        + '</svg>';
}

// ══════════════════════════════════════════════════════════
// SVG BASE (Cat version — warm parchment style)
// ══════════════════════════════════════════════════════════

function svgBase(w: number, h: number, content: string, numText: string, nameText: string): string {
    const paws = pawPrint(w * 0.09, h * 0.06, 5, '#c9a84c', 0.25)
        + pawPrint(w * 0.91, h * 0.05, 5, '#c9a84c', 0.3)
        + pawPrint(w * 0.12, h * 0.92, 5, '#c9a84c', 0.2)
        + pawPrint(w * 0.88, h * 0.93, 5, '#c9a84c', 0.25);
    const borders = `<rect x="5" y="5" width="${w - 10}" height="${h - 10}" fill="none" stroke="rgba(160,130,70,0.4)" stroke-width="1" rx="7"/>`
        + `<rect x="9" y="9" width="${w - 18}" height="${h - 18}" fill="none" stroke="rgba(160,130,70,0.2)" stroke-width="0.5" rx="4"/>`;
    const numLabel = `<text x="${w / 2}" y="22" font-family="serif" font-size="${w * 0.09}" fill="#000" text-anchor="middle" opacity="0.4" dx="0.5" dy="0.5">${numText}</text>`
        + `<text x="${w / 2}" y="22" font-family="serif" font-size="${w * 0.09}" fill="#8a6820" text-anchor="middle" opacity="0.9">${numText}</text>`;
    const nameBar = `<rect x="0" y="${h - 28}" width="${w}" height="28" fill="rgba(30,20,10,0.75)" rx="0"/>`
        + `<text x="${w / 2}" y="${h - 10}" font-family="serif" font-size="${w * 0.068}" fill="#c9a84c" text-anchor="middle" font-weight="bold" letter-spacing="1">${nameText.toUpperCase()}</text>`;
    const defs = `<defs><radialGradient id="cbg_${numText}" cx="50%" cy="35%">`
        + `<stop offset="0%" stop-color="#e8dcc8"/>`
        + `<stop offset="100%" stop-color="#c8b8a0"/>`
        + `</radialGradient></defs>`;
    return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`
        + defs
        + `<rect width="${w}" height="${h}" fill="url(#cbg_${numText})"/>`
        + content + paws + borders + numLabel + nameBar
        + '</svg>';
}

// ══════════════════════════════════════════════════════════
// MAJOR ARCANA — CAT VERSIONS
// ══════════════════════════════════════════════════════════

function drawFool(w: number, h: number): string {
    const c = ''
        // Sky
        + `<rect x="0" y="0" width="${w}" height="${h * 0.55}" fill="#c8d8e8" opacity="0.3"/>`
        // Sun
        + `<circle cx="${w * 0.78}" cy="${h * 0.12}" r="${w * 0.12}" fill="#ffe080" opacity="0.3"/>`
        + `<circle cx="${w * 0.78}" cy="${h * 0.12}" r="${w * 0.08}" fill="#ffe080" opacity="0.5"/>`
        // Cliff
        + `<path d="M${w * 0.55},${h * 0.5} L${w},${h * 0.45} L${w},${h} L0,${h} L0,${h * 0.6} Q${w * 0.3},${h * 0.55} ${w * 0.55},${h * 0.5}Z" fill="#8a9878" opacity="0.9"/>`
        + `<path d="M${w * 0.55},${h * 0.5} L${w},${h * 0.45} L${w},${h * 0.7} L${w * 0.6},${h * 0.65}Z" fill="#706858" opacity="0.6"/>`
        // Flowers at cliff
        + `<circle cx="${w * 0.15}" cy="${h * 0.58}" r="3" fill="#d08080" opacity="0.7"/>`
        + `<circle cx="${w * 0.25}" cy="${h * 0.55}" r="2.5" fill="#e0a060" opacity="0.7"/>`
        + `<circle cx="${w * 0.4}" cy="${h * 0.52}" r="2" fill="#d08080" opacity="0.6"/>`
        + `<circle cx="${w * 0.1}" cy="${h * 0.62}" r="2" fill="#a0c080" opacity="0.5"/>`
        // Grass tufts
        + `<line x1="${w * 0.08}" y1="${h * 0.6}" x2="${w * 0.06}" y2="${h * 0.55}" stroke="#6a8060" stroke-width="1.5"/>`
        + `<line x1="${w * 0.2}" y1="${h * 0.57}" x2="${w * 0.18}" y2="${h * 0.52}" stroke="#6a8060" stroke-width="1.5"/>`
        // Kitten (orange/ginger) - body
        + `<ellipse cx="${w * 0.48}" cy="${h * 0.42}" rx="${w * 0.1}" ry="${w * 0.12}" fill="#c89060"/>`
        // Kitten legs
        + `<line x1="${w * 0.4}" y1="${h * 0.5}" x2="${w * 0.38}" y2="${h * 0.57}" stroke="#c89060" stroke-width="4" stroke-linecap="round"/>`
        + `<line x1="${w * 0.55}" y1="${h * 0.5}" x2="${w * 0.57}" y2="${h * 0.55}" stroke="#c89060" stroke-width="4" stroke-linecap="round"/>`
        // Kitten tail (up, playful)
        + `<path d="M${w * 0.38},${h * 0.35} Q${w * 0.25},${h * 0.2} ${w * 0.3},${h * 0.15}" fill="none" stroke="#c89060" stroke-width="3.5" stroke-linecap="round"/>`
        // Kitten head
        + catHead(w * 0.52, h * 0.32, w * 0.2, '#c89060')
        // Stick with bag
        + `<line x1="${w * 0.42}" y1="${h * 0.28}" x2="${w * 0.32}" y2="${h * 0.55}" stroke="#6a5030" stroke-width="2"/>`
        + `<circle cx="${w * 0.42}" cy="${h * 0.25}" r="${w * 0.04}" fill="#a07848"/>`
        + `<path d="M${w * 0.39},${h * 0.22} Q${w * 0.42},${h * 0.18} ${w * 0.45},${h * 0.22}" fill="none" stroke="#8a6838" stroke-width="1"/>`
        // Butterfly
        + `<path d="M${w * 0.68},${h * 0.25} Q${w * 0.72},${h * 0.2} ${w * 0.7},${h * 0.22}" fill="#e0a0c0" opacity="0.7"/>`
        + `<path d="M${w * 0.68},${h * 0.25} Q${w * 0.64},${h * 0.2} ${w * 0.66},${h * 0.22}" fill="#c0a0d0" opacity="0.7"/>`
        + `<circle cx="${w * 0.68}" cy="${h * 0.25}" r="1" fill="#3a2818"/>`;
    return svgBase(w, h, c, '0', 'THE FOOL');
}

function drawMagician(w: number, h: number): string {
    const c = ''
        // Floor/ground
        + `<rect x="0" y="${h * 0.6}" width="${w}" height="${h * 0.4}" fill="#3a2818" opacity="0.3"/>`
        // Table
        + `<rect x="${w * 0.12}" y="${h * 0.48}" width="${w * 0.76}" height="${h * 0.06}" rx="3" fill="#5a3820" stroke="#8a6838" stroke-width="1"/>`
        + `<rect x="${w * 0.15}" y="${h * 0.54}" width="${w * 0.04}" height="${h * 0.2}" fill="#5a3820"/>`
        + `<rect x="${w * 0.81}" y="${h * 0.54}" width="${w * 0.04}" height="${h * 0.2}" fill="#5a3820"/>`
        // Items on table: cup
        + `<path d="M${w * 0.2},${h * 0.42} L${w * 0.18},${h * 0.48} L${w * 0.26},${h * 0.48} L${w * 0.24},${h * 0.42}Z" fill="#4090d0" opacity="0.8"/>`
        // Pentacle coin
        + `<circle cx="${w * 0.38}" cy="${h * 0.45}" r="${w * 0.04}" fill="#d0a830" stroke="#8a6820" stroke-width="1"/>`
        + `<text x="${w * 0.38}" y="${h * 0.465}" font-family="serif" font-size="${w * 0.04}" fill="#5a3810" text-anchor="middle">★</text>`
        // Tiny sword
        + `<line x1="${w * 0.58}" y1="${h * 0.4}" x2="${w * 0.58}" y2="${h * 0.48}" stroke="#c0c8d8" stroke-width="2"/>`
        + `<line x1="${w * 0.55}" y1="${h * 0.44}" x2="${w * 0.61}" y2="${h * 0.44}" stroke="#a0a8b8" stroke-width="1.5"/>`
        // Wand
        + `<line x1="${w * 0.74}" y1="${h * 0.38}" x2="${w * 0.74}" y2="${h * 0.48}" stroke="#8a5830" stroke-width="2.5"/>`
        + `<circle cx="${w * 0.74}" cy="${h * 0.37}" r="2.5" fill="#ff8040"/>`
        // Infinity symbol above
        + `<path d="M${w * 0.38},${h * 0.1} Q${w * 0.44},${h * 0.05} ${w * 0.5},${h * 0.1} Q${w * 0.56},${h * 0.15} ${w * 0.62},${h * 0.1} Q${w * 0.56},${h * 0.05} ${w * 0.5},${h * 0.1} Q${w * 0.44},${h * 0.15} ${w * 0.38},${h * 0.1}" fill="none" stroke="#c9a84c" stroke-width="1.5"/>`
        // Sparkles
        + `<circle cx="${w * 0.2}" cy="${h * 0.15}" r="1.5" fill="#ffe080" opacity="0.6"/>`
        + `<circle cx="${w * 0.8}" cy="${h * 0.2}" r="1" fill="#ffe080" opacity="0.5"/>`
        + `<circle cx="${w * 0.3}" cy="${h * 0.22}" r="1.2" fill="#fff" opacity="0.4"/>`
        // Black cat (sitting on table)
        + catSitting(w * 0.5, h * 0.25, w * 0.35, '#2a2028')
        // Wizard hat on cat
        + `<polygon points="${w * 0.5},${h * 0.02} ${w * 0.42},${h * 0.15} ${w * 0.58},${h * 0.15}" fill="#3a2848" stroke="#c9a84c" stroke-width="0.8"/>`
        + `<ellipse cx="${w * 0.5}" cy="${h * 0.15}" rx="${w * 0.12}" ry="${h * 0.012}" fill="#3a2848" stroke="#c9a84c" stroke-width="0.8"/>`
        + `<circle cx="${w * 0.5}" cy="${h * 0.06}" r="${w * 0.015}" fill="#ffe080"/>`;
    return svgBase(w, h, c, 'I', 'THE MAGICIAN');
}

function drawHighPriestess(w: number, h: number): string {
    const c = ''
        // Curtain background
        + `<rect x="0" y="0" width="${w}" height="${h}" fill="#2a1840" opacity="0.15"/>`
        + `<path d="M0,0 Q${w * 0.3},${h * 0.3} 0,${h}" fill="#3a2050" opacity="0.12"/>`
        + `<path d="M${w},0 Q${w * 0.7},${h * 0.3} ${w},${h}" fill="#3a2050" opacity="0.12"/>`
        // Left pillar (B)
        + `<rect x="${w * 0.06}" y="${h * 0.15}" width="${w * 0.14}" height="${h * 0.6}" rx="3" fill="#1a0840" stroke="#8a7050" stroke-width="1"/>`
        + `<text x="${w * 0.13}" y="${h * 0.28}" font-family="serif" font-size="${w * 0.1}" fill="#c9a84c" text-anchor="middle" opacity="0.8">B</text>`
        // Right pillar (J)
        + `<rect x="${w * 0.8}" y="${h * 0.15}" width="${w * 0.14}" height="${h * 0.6}" rx="3" fill="#0d0820" stroke="#8a7050" stroke-width="1"/>`
        + `<text x="${w * 0.87}" y="${h * 0.28}" font-family="serif" font-size="${w * 0.1}" fill="#c9a84c" text-anchor="middle" opacity="0.8">J</text>`
        // Moon phases above
        + `<circle cx="${w * 0.35}" cy="${h * 0.1}" r="${w * 0.03}" fill="#c9a84c" opacity="0.4"/>`
        + `<circle cx="${w * 0.5}" cy="${h * 0.08}" r="${w * 0.04}" fill="#e0d8c0" opacity="0.8"/>`
        + `<circle cx="${w * 0.65}" cy="${h * 0.1}" r="${w * 0.03}" fill="#c9a84c" opacity="0.4"/>`
        // Crystal ball
        + `<circle cx="${w * 0.72}" cy="${h * 0.65}" r="${w * 0.06}" fill="#a0b0d0" opacity="0.4" stroke="#8090b0" stroke-width="0.8"/>`
        + `<circle cx="${w * 0.7}" cy="${h * 0.63}" r="${w * 0.015}" fill="#fff" opacity="0.5"/>`
        // Books
        + `<rect x="${w * 0.22}" y="${h * 0.64}" width="${w * 0.12}" height="${h * 0.04}" rx="1" fill="#8a4030"/>`
        + `<rect x="${w * 0.2}" y="${h * 0.68}" width="${w * 0.14}" height="${h * 0.035}" rx="1" fill="#4a6080"/>`
        // Elegant black cat
        + catSitting(w * 0.5, h * 0.35, w * 0.4, '#2a2028')
        // Crescent on cat's forehead
        + `<path d="M${w * 0.47},${h * 0.19} A${w * 0.03},${w * 0.03} 0 1,0 ${w * 0.53},${h * 0.19} A${w * 0.025},${w * 0.025} 0 0,1 ${w * 0.47},${h * 0.19}" fill="#e0d8c0"/>`;
    return svgBase(w, h, c, 'II', 'HIGH PRIESTESS');
}

function drawEmpress(w: number, h: number): string {
    const c = ''
        // Garden background
        + `<rect x="0" y="${h * 0.55}" width="${w}" height="${h * 0.45}" fill="#506838" opacity="0.3"/>`
        // Flowers
        + `<circle cx="${w * 0.1}" cy="${h * 0.6}" r="3" fill="#d07080" opacity="0.7"/>`
        + `<circle cx="${w * 0.25}" cy="${h * 0.65}" r="2.5" fill="#e0a060" opacity="0.6"/>`
        + `<circle cx="${w * 0.85}" cy="${h * 0.58}" r="3" fill="#d08090" opacity="0.7"/>`
        + `<circle cx="${w * 0.7}" cy="${h * 0.63}" r="2" fill="#e0b070" opacity="0.6"/>`
        // Wheat stalks
        + `<line x1="${w * 0.05}" y1="${h * 0.55}" x2="${w * 0.03}" y2="${h * 0.4}" stroke="#c0a050" stroke-width="1.5"/>`
        + `<line x1="${w * 0.95}" y1="${h * 0.55}" x2="${w * 0.93}" y2="${h * 0.42}" stroke="#c0a050" stroke-width="1.5"/>`
        // Cushion/throne
        + `<ellipse cx="${w * 0.5}" cy="${h * 0.55}" rx="${w * 0.28}" ry="${h * 0.08}" fill="#c04050" opacity="0.7"/>`
        + `<rect x="${w * 0.25}" y="${h * 0.35}" width="${w * 0.5}" height="${h * 0.22}" rx="8" fill="#a03040" opacity="0.6"/>`
        // Venus symbol
        + `<circle cx="${w * 0.82}" cy="${h * 0.25}" r="${w * 0.04}" fill="none" stroke="#c9a84c" stroke-width="1.5"/>`
        + `<line x1="${w * 0.82}" y1="${h * 0.29}" x2="${w * 0.82}" y2="${h * 0.36}" stroke="#c9a84c" stroke-width="1.5"/>`
        + `<line x1="${w * 0.78}" y1="${h * 0.32}" x2="${w * 0.86}" y2="${h * 0.32}" stroke="#c9a84c" stroke-width="1.2"/>`
        // Calico cat lounging on cushion
        + `<ellipse cx="${w * 0.5}" cy="${h * 0.42}" rx="${w * 0.2}" ry="${w * 0.14}" fill="#f0e8d8"/>`
        + `<ellipse cx="${w * 0.42}" cy="${h * 0.44}" rx="${w * 0.06}" ry="${w * 0.05}" fill="#c89060"/>`
        + `<ellipse cx="${w * 0.58}" cy="${h * 0.4}" rx="${w * 0.05}" ry="${w * 0.04}" fill="#2a2028"/>`
        // Cat head
        + catHead(w * 0.5, h * 0.28, w * 0.25, '#f0e8d8')
        // Crown
        + `<rect x="${w * 0.38}" y="${h * 0.18}" width="${w * 0.24}" height="${h * 0.025}" rx="1" fill="#c9a84c"/>`
        + `<polygon points="${w * 0.42},${h * 0.18} ${w * 0.44},${h * 0.15} ${w * 0.46},${h * 0.18}" fill="#c9a84c"/>`
        + `<polygon points="${w * 0.48},${h * 0.18} ${w * 0.5},${h * 0.14} ${w * 0.52},${h * 0.18}" fill="#c9a84c"/>`
        + `<polygon points="${w * 0.54},${h * 0.18} ${w * 0.56},${h * 0.15} ${w * 0.58},${h * 0.18}" fill="#c9a84c"/>`
        + `<circle cx="${w * 0.5}" cy="${h * 0.145}" r="${w * 0.012}" fill="#ff4040"/>`;
    return svgBase(w, h, c, 'III', 'THE EMPRESS');
}

// Remaining Major Arcana — simplified but complete
function drawEmperor(w: number, h: number): string {
    const c = `<path d="M0,${h * 0.55} L${w * 0.2},${h * 0.35} L${w * 0.5},${h * 0.45} L${w * 0.8},${h * 0.3} L${w},${h * 0.5} L${w},${h} L0,${h}Z" fill="#706058" opacity="0.4"/>`
        + `<rect x="${w * 0.2}" y="${h * 0.3}" width="${w * 0.6}" height="${h * 0.45}" rx="6" fill="#8b1a2a" opacity="0.4"/>`
        + catSitting(w * 0.5, h * 0.3, w * 0.4, '#808070')
        + `<rect x="${w * 0.38}" y="${h * 0.13}" width="${w * 0.24}" height="${h * 0.03}" rx="2" fill="#c9a84c"/>`
        + `<polygon points="${w * 0.42},${h * 0.13} ${w * 0.45},${h * 0.09} ${w * 0.48},${h * 0.13}" fill="#c9a84c"/>`
        + `<polygon points="${w * 0.5},${h * 0.13} ${w * 0.5},${h * 0.08} ${w * 0.5},${h * 0.13}" fill="#c9a84c"/>`
        + `<polygon points="${w * 0.52},${h * 0.13} ${w * 0.55},${h * 0.09} ${w * 0.58},${h * 0.13}" fill="#c9a84c"/>`
        + `<circle cx="${w * 0.5}" cy="${h * 0.09}" r="${w * 0.015}" fill="#ff2020"/>`
        + `<line x1="${w * 0.7}" y1="${h * 0.2}" x2="${w * 0.72}" y2="${h * 0.55}" stroke="#c9a84c" stroke-width="2.5"/>`
        + `<circle cx="${w * 0.7}" cy="${h * 0.19}" r="${w * 0.025}" fill="none" stroke="#c9a84c" stroke-width="1.5"/>`
        + `<line x1="${w * 0.67}" y1="${h * 0.22}" x2="${w * 0.73}" y2="${h * 0.22}" stroke="#c9a84c" stroke-width="1.5"/>`;
    return svgBase(w, h, c, 'IV', 'THE EMPEROR');
}

function drawHierophant(w: number, h: number): string {
    const c = `<rect x="${w * 0.06}" y="${h * 0.15}" width="${w * 0.12}" height="${h * 0.6}" rx="3" fill="#3a2838" stroke="#8a7050" stroke-width="1"/>`
        + `<rect x="${w * 0.82}" y="${h * 0.15}" width="${w * 0.12}" height="${h * 0.6}" rx="3" fill="#3a2838" stroke="#8a7050" stroke-width="1"/>`
        + catSitting(w * 0.5, h * 0.28, w * 0.38, '#f0e8d8')
        + `<rect x="${w * 0.36}" y="${h * 0.12}" width="${w * 0.28}" height="${h * 0.04}" rx="2" fill="#c9a84c"/>`
        + `<rect x="${w * 0.38}" y="${h * 0.08}" width="${w * 0.24}" height="${h * 0.04}" rx="2" fill="#c9a84c"/>`
        + `<rect x="${w * 0.41}" y="${h * 0.05}" width="${w * 0.18}" height="${h * 0.03}" rx="2" fill="#c9a84c"/>`
        + `<circle cx="${w * 0.3}" cy="${h * 0.7}" r="${w * 0.04}" fill="#c89060"/>`
        + `<circle cx="${w * 0.7}" cy="${h * 0.7}" r="${w * 0.04}" fill="#808070"/>`
        + `<line x1="${w * 0.65}" y1="${h * 0.18}" x2="${w * 0.68}" y2="${h * 0.6}" stroke="#c9a84c" stroke-width="2.5"/>`;
    return svgBase(w, h, c, 'V', 'THE HIEROPHANT');
}

function drawLovers(w: number, h: number): string {
    const c = `<rect x="0" y="${h * 0.65}" width="${w}" height="${h * 0.35}" fill="#506838" opacity="0.3"/>`
        + `<circle cx="${w * 0.5}" cy="${h * 0.12}" r="${w * 0.12}" fill="#ffe080" opacity="0.2"/>`
        + `<line x1="${w * 0.28}" y1="${h * 0.65}" x2="${w * 0.26}" y2="${h * 0.45}" stroke="#4a3018" stroke-width="3"/>`
        + `<circle cx="${w * 0.26}" cy="${h * 0.42}" r="${w * 0.08}" fill="#508030" opacity="0.7"/>`
        + `<line x1="${w * 0.72}" y1="${h * 0.65}" x2="${w * 0.74}" y2="${h * 0.45}" stroke="#4a3018" stroke-width="3"/>`
        + `<circle cx="${w * 0.74}" cy="${h * 0.42}" r="${w * 0.08}" fill="#a03830" opacity="0.6"/>`
        + catSitting(w * 0.35, h * 0.48, w * 0.28, '#c89060')
        + catSitting(w * 0.65, h * 0.48, w * 0.28, '#808070')
        + `<path d="M${w * 0.43},${h * 0.42} Q${w * 0.5},${h * 0.38} ${w * 0.57},${h * 0.42}" fill="none" stroke="#d08080" stroke-width="1.5"/>`;
    return svgBase(w, h, c, 'VI', 'THE LOVERS');
}

function drawChariot(w: number, h: number): string {
    const c = `<rect x="${w * 0.15}" y="${h * 0.45}" width="${w * 0.7}" height="${h * 0.25}" rx="5" fill="#3a2838" stroke="#c9a84c" stroke-width="1.2"/>`
        + `<circle cx="${w * 0.22}" cy="${h * 0.72}" r="${w * 0.06}" fill="none" stroke="#8a6820" stroke-width="2"/>`
        + `<circle cx="${w * 0.78}" cy="${h * 0.72}" r="${w * 0.06}" fill="none" stroke="#8a6820" stroke-width="2"/>`
        + `<rect x="${w * 0.2}" y="${h * 0.35}" width="${w * 0.6}" height="${h * 0.06}" rx="3" fill="#1a0840" stroke="#c9a84c" stroke-width="1"/>`
        + `<circle cx="${w * 0.35}" cy="${h * 0.38}" r="1.5" fill="#fff" opacity="0.6"/>`
        + `<circle cx="${w * 0.5}" cy="${h * 0.37}" r="1.5" fill="#c9a84c" opacity="0.7"/>`
        + `<circle cx="${w * 0.65}" cy="${h * 0.38}" r="1.5" fill="#fff" opacity="0.5"/>`
        + catHead(w * 0.5, h * 0.26, w * 0.22, '#f0e8d8')
        + `<rect x="${w * 0.42}" y="${h * 0.16}" width="${w * 0.16}" height="${h * 0.03}" rx="2" fill="#c9a84c"/>`
        + catSitting(w * 0.25, h * 0.65, w * 0.2, '#2a2028')
        + catSitting(w * 0.75, h * 0.65, w * 0.2, '#f0e8d8');
    return svgBase(w, h, c, 'VII', 'THE CHARIOT');
}

function drawStrength(w: number, h: number): string {
    const c = `<path d="M0,${h * 0.6} Q${w * 0.5},${h * 0.5} ${w},${h * 0.55} L${w},${h} L0,${h}Z" fill="#8a9878" opacity="0.3"/>`
        + `<circle cx="${w * 0.12}" cy="${h * 0.62}" r="2" fill="#d08080" opacity="0.6"/>`
        + `<circle cx="${w * 0.22}" cy="${h * 0.58}" r="2.5" fill="#e0a060" opacity="0.5"/>`
        + `<ellipse cx="${w * 0.55}" cy="${h * 0.58}" rx="${w * 0.2}" ry="${w * 0.12}" fill="#c89060"/>`
        + catHead(w * 0.65, h * 0.48, w * 0.25, '#c89060')
        + `<path d="M${w * 0.65},${h * 0.42} Q${w * 0.72},${h * 0.38} ${w * 0.68},${h * 0.35} Q${w * 0.62},${h * 0.32} ${w * 0.58},${h * 0.38}" fill="none" stroke="#c89060" stroke-width="3" stroke-linecap="round"/>`
        + catSitting(w * 0.35, h * 0.38, w * 0.3, '#f0e8d8')
        + `<circle cx="${w * 0.3}" cy="${h * 0.28}" r="2" fill="#d08080" opacity="0.6"/>`
        + `<circle cx="${w * 0.38}" cy="${h * 0.26}" r="1.5" fill="#e0a060" opacity="0.5"/>`
        + `<path d="M${w * 0.28},${h * 0.12} Q${w * 0.32},${h * 0.08} ${w * 0.38},${h * 0.12} Q${w * 0.44},${h * 0.16} ${w * 0.48},${h * 0.12} Q${w * 0.44},${h * 0.08} ${w * 0.38},${h * 0.12} Q${w * 0.32},${h * 0.16} ${w * 0.28},${h * 0.12}" fill="none" stroke="#c9a84c" stroke-width="1.5"/>`;
    return svgBase(w, h, c, 'VIII', 'STRENGTH');
}

function drawHermit(w: number, h: number): string {
    const c = `<path d="M0,${h * 0.45} L${w * 0.3},${h * 0.3} L${w * 0.6},${h * 0.4} L${w},${h * 0.32} L${w},${h} L0,${h}Z" fill="#505860" opacity="0.4"/>`
        + `<circle cx="${w * 0.15}" cy="${h * 0.08}" r="1.5" fill="#fff" opacity="0.7"/>`
        + `<circle cx="${w * 0.82}" cy="${h * 0.06}" r="1.2" fill="#c9a84c" opacity="0.8"/>`
        + `<circle cx="${w * 0.6}" cy="${h * 0.12}" r="1" fill="#fff" opacity="0.5"/>`
        + catSitting(w * 0.45, h * 0.38, w * 0.4, '#808070')
        + `<path d="M${w * 0.35},${h * 0.22} Q${w * 0.4},${h * 0.15} ${w * 0.45},${h * 0.2} Q${w * 0.5},${h * 0.15} ${w * 0.55},${h * 0.22}" fill="#606058" opacity="0.5"/>`
        + `<line x1="${w * 0.32}" y1="${h * 0.7}" x2="${w * 0.3}" y2="${h * 0.25}" stroke="#6a5840" stroke-width="2.5"/>`
        + `<rect x="${w * 0.62}" y="${h * 0.2}" width="${w * 0.1}" height="${h * 0.12}" rx="2" fill="#1a1008" stroke="#c9a84c" stroke-width="1"/>`
        + `<circle cx="${w * 0.67}" cy="${h * 0.26}" r="${w * 0.03}" fill="#ffcc00" opacity="0.8"/>`
        + `<circle cx="${w * 0.67}" cy="${h * 0.26}" r="${w * 0.015}" fill="#fff8e0" opacity="0.9"/>`
        + `<circle cx="${w * 0.67}" cy="${h * 0.26}" r="${w * 0.08}" fill="#ffcc00" opacity="0.06"/>`;
    return svgBase(w, h, c, 'IX', 'THE HERMIT');
}

function drawWheel(w: number, h: number): string {
    const c = `<circle cx="${w * 0.5}" cy="${h * 0.46}" r="${w * 0.35}" fill="none" stroke="#c9a84c" stroke-width="2.5"/>`
        + `<circle cx="${w * 0.5}" cy="${h * 0.46}" r="${w * 0.24}" fill="none" stroke="#8a6820" stroke-width="1.5"/>`
        + `<circle cx="${w * 0.5}" cy="${h * 0.46}" r="${w * 0.1}" fill="#1a0820" stroke="#c9a84c" stroke-width="1.5"/>`
        + `<line x1="${w * 0.5}" y1="${h * 0.11}" x2="${w * 0.5}" y2="${h * 0.81}" stroke="#c9a84c" stroke-width="1"/>`
        + `<line x1="${w * 0.15}" y1="${h * 0.46}" x2="${w * 0.85}" y2="${h * 0.46}" stroke="#c9a84c" stroke-width="1"/>`
        + `<text x="${w * 0.5}" y="${h * 0.48}" font-family="serif" font-size="${w * 0.06}" fill="#c9a84c" text-anchor="middle">TARO</text>`
        + catHead(w * 0.5, h * 0.12, w * 0.15, '#c89060')
        + `<path d="M${w * 0.14},${h * 0.4} Q${w * 0.1},${h * 0.5} ${w * 0.14},${h * 0.62}" fill="none" stroke="#508030" stroke-width="3" stroke-linecap="round"/>`
        + pawPrint(w * 0.5, h * 0.42, 8, '#c9a84c', 0.4);
    return svgBase(w, h, c, 'X', 'WHEEL OF FORTUNE');
}

function drawJustice(w: number, h: number): string {
    const c = `<rect x="${w * 0.08}" y="${h * 0.15}" width="${w * 0.12}" height="${h * 0.6}" rx="3" fill="#3a1828" stroke="#8a7050" stroke-width="1"/>`
        + `<rect x="${w * 0.8}" y="${h * 0.15}" width="${w * 0.12}" height="${h * 0.6}" rx="3" fill="#3a1828" stroke="#8a7050" stroke-width="1"/>`
        + catSitting(w * 0.5, h * 0.3, w * 0.38, '#2a2028')
        + `<rect x="${w * 0.38}" y="${h * 0.14}" width="${w * 0.24}" height="${h * 0.03}" rx="2" fill="#c9a84c"/>`
        + `<line x1="${w * 0.5}" y1="${h * 0.28}" x2="${w * 0.5}" y2="${h * 0.42}" stroke="#c9a84c" stroke-width="2"/>`
        + `<line x1="${w * 0.25}" y1="${h * 0.35}" x2="${w * 0.75}" y2="${h * 0.35}" stroke="#c9a84c" stroke-width="1.5"/>`
        + `<path d="M${w * 0.2},${h * 0.4} Q${w * 0.25},${h * 0.43} ${w * 0.3},${h * 0.4}" fill="none" stroke="#c9a84c" stroke-width="1.5"/>`
        + `<path d="M${w * 0.7},${h * 0.4} Q${w * 0.75},${h * 0.43} ${w * 0.8},${h * 0.4}" fill="none" stroke="#c9a84c" stroke-width="1.5"/>`
        + `<line x1="${w * 0.72}" y1="${h * 0.18}" x2="${w * 0.74}" y2="${h * 0.58}" stroke="#c8c8d8" stroke-width="2.5"/>`;
    return svgBase(w, h, c, 'XI', 'JUSTICE');
}

function drawHangedMan(w: number, h: number): string {
    const c = `<line x1="${w * 0.2}" y1="${h * 0.12}" x2="${w * 0.2}" y2="${h * 0.8}" stroke="#4a3018" stroke-width="8"/>`
        + `<line x1="${w * 0.8}" y1="${h * 0.12}" x2="${w * 0.8}" y2="${h * 0.8}" stroke="#4a3018" stroke-width="8"/>`
        + `<line x1="${w * 0.2}" y1="${h * 0.2}" x2="${w * 0.8}" y2="${h * 0.2}" stroke="#4a3018" stroke-width="6"/>`
        + `<circle cx="${w * 0.2}" cy="${h * 0.13}" r="${w * 0.04}" fill="#508030" opacity="0.7"/>`
        + `<circle cx="${w * 0.8}" cy="${h * 0.13}" r="${w * 0.04}" fill="#508030" opacity="0.7"/>`
        + `<line x1="${w * 0.5}" y1="${h * 0.2}" x2="${w * 0.5}" y2="${h * 0.35}" stroke="#c8a870" stroke-width="1.5"/>`
        + `<ellipse cx="${w * 0.5}" cy="${h * 0.52}" rx="${w * 0.1}" ry="${w * 0.14}" fill="#c89060"/>`
        + catHead(w * 0.5, h * 0.68, w * 0.22, '#c89060')
        + `<circle cx="${w * 0.5}" cy="${h * 0.68}" r="${w * 0.14}" fill="none" stroke="#c9a84c" stroke-width="1" opacity="0.5" stroke-dasharray="3 3"/>`
        + `<line x1="${w * 0.5}" y1="${h * 0.42}" x2="${w * 0.5}" y2="${h * 0.35}" stroke="#808070" stroke-width="3"/>`;
    return svgBase(w, h, c, 'XII', 'THE HANGED MAN');
}

function drawDeath(w: number, h: number): string {
    const c = `<rect x="0" y="${h * 0.7}" width="${w}" height="${h * 0.3}" fill="#2a1810" opacity="0.5"/>`
        + `<circle cx="${w * 0.8}" cy="${h * 0.15}" r="${w * 0.15}" fill="#e0a050" opacity="0.15"/>`
        + `<circle cx="${w * 0.8}" cy="${h * 0.15}" r="${w * 0.08}" fill="#e0a050" opacity="0.25"/>`
        + `<rect x="${w * 0.05}" y="${h * 0.45}" width="${w * 0.12}" height="${h * 0.25}" fill="#505058" opacity="0.5"/>`
        + `<polygon points="${w * 0.05},${h * 0.45} ${w * 0.11},${h * 0.4} ${w * 0.17},${h * 0.45}" fill="#505058" opacity="0.5"/>`
        + `<rect x="${w * 0.85}" y="${h * 0.48}" width="${w * 0.1}" height="${h * 0.22}" fill="#505058" opacity="0.5"/>`
        + `<polygon points="${w * 0.85},${h * 0.48} ${w * 0.9},${h * 0.43} ${w * 0.95},${h * 0.48}" fill="#505058" opacity="0.5"/>`
        + catSitting(w * 0.5, h * 0.38, w * 0.4, '#2a2028')
        + `<rect x="${w * 0.4}" y="${h * 0.35}" width="${w * 0.2}" height="${h * 0.22}" rx="3" fill="#1a1018" opacity="0.6"/>`
        + `<line x1="${w * 0.65}" y1="${h * 0.12}" x2="${w * 0.67}" y2="${h * 0.55}" stroke="#808078" stroke-width="2"/>`
        + `<rect x="${w * 0.62}" y="${h * 0.08}" width="${w * 0.1}" height="${h * 0.06}" fill="#f0e8d8"/>`
        + `<circle cx="${w * 0.67}" cy="${h * 0.105}" r="${w * 0.015}" fill="#d08080"/>`;
    return svgBase(w, h, c, 'XIII', 'DEATH');
}

function drawTemperance(w: number, h: number): string {
    const c = `<path d="M0,${h * 0.7} L${w * 0.3},${h * 0.65} Q${w * 0.5},${h * 0.72} ${w * 0.7},${h * 0.65} L${w},${h * 0.7} L${w},${h} L0,${h}Z" fill="#4a7868" opacity="0.3"/>`
        + `<circle cx="${w * 0.15}" cy="${h * 0.68}" r="2" fill="#d080a0" opacity="0.5"/>`
        + `<circle cx="${w * 0.85}" cy="${h * 0.67}" r="2.5" fill="#d080a0" opacity="0.5"/>`
        + catSitting(w * 0.5, h * 0.35, w * 0.38, '#f0e8d8')
        + `<path d="M${w * 0.25},${h * 0.24} Q${w * 0.15},${h * 0.12} ${w * 0.25},${h * 0.06} Q${w * 0.12},${h * 0.02} ${w * 0.08},${h * 0.15}" fill="#e8e0f0" opacity="0.5"/>`
        + `<path d="M${w * 0.75},${h * 0.24} Q${w * 0.85},${h * 0.12} ${w * 0.75},${h * 0.06} Q${w * 0.88},${h * 0.02} ${w * 0.92},${h * 0.15}" fill="#e8e0f0" opacity="0.5"/>`
        + `<path d="M${w * 0.3},${h * 0.38} L${w * 0.28},${h * 0.45} L${w * 0.34},${h * 0.45} L${w * 0.32},${h * 0.38}Z" fill="#4090d0" opacity="0.7"/>`
        + `<path d="M${w * 0.66},${h * 0.38} L${w * 0.64},${h * 0.45} L${w * 0.7},${h * 0.45} L${w * 0.68},${h * 0.38}Z" fill="#4090d0" opacity="0.7"/>`
        + `<path d="M${w * 0.34},${h * 0.38} Q${w * 0.5},${h * 0.3} ${w * 0.66},${h * 0.38}" fill="none" stroke="#80c0e0" stroke-width="2" opacity="0.5"/>`;
    return svgBase(w, h, c, 'XIV', 'TEMPERANCE');
}

function drawDevil(w: number, h: number): string {
    const c = `<rect x="0" y="0" width="${w}" height="${h}" fill="#1a0a08" opacity="0.2"/>`
        + `<rect x="${w * 0.3}" y="${h * 0.55}" width="${w * 0.4}" height="${h * 0.2}" rx="4" fill="#3a2018" stroke="#5a3018" stroke-width="1"/>`
        + catSitting(w * 0.5, h * 0.28, w * 0.42, '#2a2028')
        + `<polygon points="${w * 0.38},${h * 0.1} ${w * 0.4},${h * 0.02} ${w * 0.42},${h * 0.1}" fill="#5a3828"/>`
        + `<polygon points="${w * 0.58},${h * 0.1} ${w * 0.6},${h * 0.02} ${w * 0.62},${h * 0.1}" fill="#5a3828"/>`
        + `<path d="M${w * 0.25},${h * 0.22} Q${w * 0.15},${h * 0.1} ${w * 0.1},${h * 0.25} L${w * 0.2},${h * 0.35}" fill="#2a1820" opacity="0.6"/>`
        + `<path d="M${w * 0.75},${h * 0.22} Q${w * 0.85},${h * 0.1} ${w * 0.9},${h * 0.25} L${w * 0.8},${h * 0.35}" fill="#2a1820" opacity="0.6"/>`
        + `<polygon points="${w * 0.42},${h * 0.08} ${w * 0.5},${h * 0.05} ${w * 0.58},${h * 0.08} ${w * 0.55},${h * 0.12} ${w * 0.45},${h * 0.12}" fill="none" stroke="#c9a84c" stroke-width="1" opacity="0.6"/>`
        + catSitting(w * 0.3, h * 0.65, w * 0.18, '#808070')
        + catSitting(w * 0.7, h * 0.65, w * 0.18, '#c89060')
        + `<path d="M${w * 0.38},${h * 0.72} L${w * 0.45},${h * 0.68}" stroke="#606058" stroke-width="1.5"/>`
        + `<path d="M${w * 0.62},${h * 0.72} L${w * 0.55},${h * 0.68}" stroke="#606058" stroke-width="1.5"/>`;
    return svgBase(w, h, c, 'XV', 'THE DEVIL');
}

function drawTower(w: number, h: number): string {
    const c = `<rect x="0" y="0" width="${w}" height="${h}" fill="#1a1828" opacity="0.15"/>`
        + `<rect x="${w * 0.3}" y="${h * 0.2}" width="${w * 0.4}" height="${h * 0.6}" rx="3" fill="#706050" stroke="#5a4830" stroke-width="1.5"/>`
        + `<rect x="${w * 0.38}" y="${h * 0.35}" width="${w * 0.08}" height="${h * 0.08}" fill="#2a1810"/>`
        + `<rect x="${w * 0.54}" y="${h * 0.5}" width="${w * 0.08}" height="${h * 0.08}" fill="#2a1810"/>`
        + `<polygon points="${w * 0.28},${h * 0.2} ${w * 0.5},${h * 0.08} ${w * 0.72},${h * 0.2}" fill="#8a7060"/>`
        + `<line x1="${w * 0.5}" y1="${h * 0.04} " x2="${w * 0.2}" y2="${h * 0.25}" stroke="#ffe040" stroke-width="3"/>`
        + `<line x1="${w * 0.2}" y1="${h * 0.25}" x2="${w * 0.4}" y2="${h * 0.15}" stroke="#ffe040" stroke-width="2.5"/>`
        + `<circle cx="${w * 0.5}" cy="${h * 0.04}" r="${w * 0.02}" fill="#fff" opacity="0.8"/>`
        + catHead(w * 0.2, h * 0.45, w * 0.15, '#c89060')
        + `<ellipse cx="${w * 0.2}" cy="${h * 0.55}" rx="${w * 0.05}" ry="${w * 0.07}" fill="#c89060"/>`
        + catHead(w * 0.8, h * 0.55, w * 0.15, '#2a2028')
        + `<ellipse cx="${w * 0.8}" cy="${h * 0.65}" rx="${w * 0.05}" ry="${w * 0.07}" fill="#2a2028"/>`
        + `<rect x="${w * 0.4}" y="${h * 0.06}" width="${w * 0.2}" height="${h * 0.04}" rx="2" fill="#c9a84c" opacity="0.5"/>`;
    return svgBase(w, h, c, 'XVI', 'THE TOWER');
}

function drawStar(w: number, h: number): string {
    const c = `<rect x="0" y="0" width="${w}" height="${h}" fill="#0a0818" opacity="0.15"/>`
        + `<rect x="0" y="${h * 0.65}" width="${w}" height="${h * 0.35}" fill="#2a4050" opacity="0.2"/>`
        + `<ellipse cx="${w * 0.35}" cy="${h * 0.7}" rx="${w * 0.3}" ry="${h * 0.08}" fill="#4080a0" opacity="0.15"/>`
        + `<polygon points="${w * 0.5},${h * 0.05} ${w * 0.53},${h * 0.12} ${w * 0.6},${h * 0.12} ${w * 0.55},${h * 0.17} ${w * 0.57},${h * 0.24} ${w * 0.5},${h * 0.2} ${w * 0.43},${h * 0.24} ${w * 0.45},${h * 0.17} ${w * 0.4},${h * 0.12} ${w * 0.47},${h * 0.12}" fill="#c9a84c" opacity="0.8"/>`
        + `<circle cx="${w * 0.25}" cy="${h * 0.12}" r="2" fill="#fff" opacity="0.6"/>`
        + `<circle cx="${w * 0.75}" cy="${h * 0.1}" r="2" fill="#fff" opacity="0.5"/>`
        + `<circle cx="${w * 0.15}" cy="${h * 0.22}" r="1.5" fill="#c9a84c" opacity="0.5"/>`
        + `<circle cx="${w * 0.85}" cy="${h * 0.2}" r="1.5" fill="#c9a84c" opacity="0.4"/>`
        + `<circle cx="${w * 0.35}" cy="${h * 0.08}" r="1.5" fill="#fff" opacity="0.4"/>`
        + `<circle cx="${w * 0.65}" cy="${h * 0.06}" r="1.5" fill="#fff" opacity="0.5"/>`
        + `<circle cx="${w * 0.5}" cy="${h * 0.32}" r="1.5" fill="#c9a84c" opacity="0.3"/>`
        + catSitting(w * 0.42, h * 0.48, w * 0.38, '#f0e8d8')
        + `<path d="M${w * 0.28},${h * 0.45} L${w * 0.22},${h * 0.55} L${w * 0.3},${h * 0.55} L${w * 0.26},${h * 0.45}Z" fill="#4090d0" opacity="0.5"/>`
        + `<path d="M${w * 0.6},${h * 0.55} Q${w * 0.65},${h * 0.6} ${w * 0.7},${h * 0.68}" fill="none" stroke="#80c0e0" stroke-width="2" opacity="0.4"/>`;
    return svgBase(w, h, c, 'XVII', 'THE STAR');
}

function drawMoon(w: number, h: number): string {
    const c = `<rect x="0" y="0" width="${w}" height="${h}" fill="#0a0818" opacity="0.15"/>`
        + `<path d="M0,${h * 0.65} Q${w * 0.5},${h * 0.6} ${w},${h * 0.65} L${w},${h} L0,${h}Z" fill="#2a3848" opacity="0.3"/>`
        + `<circle cx="${w * 0.5}" cy="${h * 0.15}" r="${w * 0.14}" fill="#e0d8c0" opacity="0.6"/>`
        + `<circle cx="${w * 0.55}" cy="${h * 0.13}" r="${w * 0.11}" fill="#c8b8a0" opacity="0.4"/>`
        + `<circle cx="${w * 0.5}" cy="${h * 0.15}" r="${w * 0.18}" fill="#e0d8c0" opacity="0.08"/>`
        + `<rect x="${w * 0.08}" y="${h * 0.42}" width="${w * 0.12}" height="${h * 0.25}" fill="#505058" opacity="0.5"/>`
        + `<polygon points="${w * 0.08},${h * 0.42} ${w * 0.14},${h * 0.37} ${w * 0.2},${h * 0.42}" fill="#505058" opacity="0.5"/>`
        + `<rect x="${w * 0.8}" y="${h * 0.44}" width="${w * 0.12}" height="${h * 0.23}" fill="#505058" opacity="0.5"/>`
        + `<polygon points="${w * 0.8},${h * 0.44} ${w * 0.86},${h * 0.39} ${w * 0.92},${h * 0.44}" fill="#505058" opacity="0.5"/>`
        + catSitting(w * 0.35, h * 0.48, w * 0.25, '#808070')
        + catSitting(w * 0.65, h * 0.48, w * 0.25, '#2a2028')
        + `<ellipse cx="${w * 0.5}" cy="${h * 0.75}" rx="${w * 0.06}" ry="${w * 0.04}" fill="#a03020" opacity="0.5"/>`
        + `<line x1="${w * 0.48}" y1="${h * 0.73}" x2="${w * 0.44}" y2="${h * 0.7}" stroke="#a03020" stroke-width="1.5"/>`
        + `<line x1="${w * 0.52}" y1="${h * 0.73}" x2="${w * 0.56}" y2="${h * 0.7}" stroke="#a03020" stroke-width="1.5"/>`;
    return svgBase(w, h, c, 'XVIII', 'THE MOON');
}

function drawSun(w: number, h: number): string {
    const rays = Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const x1 = w * 0.5 + Math.cos(angle) * w * 0.14;
        const y1 = h * 0.18 + Math.sin(angle) * w * 0.14;
        const x2 = w * 0.5 + Math.cos(angle) * w * 0.25;
        const y2 = h * 0.18 + Math.sin(angle) * w * 0.25;
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#e0a030" stroke-width="${i % 2 === 0 ? 2 : 1}" opacity="${i % 2 === 0 ? 0.6 : 0.3}"/>`;
    }).join('');

    const c = rays
        + `<circle cx="${w * 0.5}" cy="${h * 0.18}" r="${w * 0.12}" fill="#ffe060" opacity="0.8"/>`
        + `<circle cx="${w * 0.5}" cy="${h * 0.18}" r="${w * 0.08}" fill="#fff0a0" opacity="0.9"/>`
        + `<circle cx="${w * 0.46}" cy="${h * 0.16}" r="${w * 0.015}" fill="#8a6020"/>`
        + `<circle cx="${w * 0.54}" cy="${h * 0.16}" r="${w * 0.015}" fill="#8a6020"/>`
        + `<path d="M${w * 0.46},${h * 0.2} Q${w * 0.5},${h * 0.23} ${w * 0.54},${h * 0.2}" fill="none" stroke="#8a6020" stroke-width="1"/>`
        + `<rect x="0" y="${h * 0.6}" width="${w}" height="${h * 0.4}" fill="#8a9878" opacity="0.3"/>`
        + `<rect x="${w * 0.1}" y="${h * 0.55}" width="${w * 0.8}" height="${h * 0.08}" fill="#a09068" opacity="0.4"/>`
        + `<circle cx="${w * 0.15}" cy="${h * 0.5}" r="${w * 0.04}" fill="#e0a030" opacity="0.3"/>`
        + `<line x1="${w * 0.15}" y1="${h * 0.55}" x2="${w * 0.14}" y2="${h * 0.42}" stroke="#6a8030" stroke-width="1.5"/>`
        + `<circle cx="${w * 0.85}" cy="${h * 0.5}" r="${w * 0.04}" fill="#e0a030" opacity="0.3"/>`
        + `<line x1="${w * 0.85}" y1="${h * 0.55}" x2="${w * 0.84}" y2="${h * 0.42}" stroke="#6a8030" stroke-width="1.5"/>`
        // Happy ginger kitten
        + `<ellipse cx="${w * 0.5}" cy="${h * 0.52}" rx="${w * 0.12}" ry="${w * 0.1}" fill="#c89060"/>`
        + `<ellipse cx="${w * 0.42}" cy="${h * 0.57}" rx="${w * 0.035}" ry="${w * 0.025}" fill="#c89060"/>`
        + `<ellipse cx="${w * 0.58}" cy="${h * 0.57}" rx="${w * 0.035}" ry="${w * 0.025}" fill="#c89060"/>`
        + catHead(w * 0.5, h * 0.42, w * 0.22, '#c89060')
        + `<path d="M${w * 0.6},${h * 0.48} Q${w * 0.7},${h * 0.35} ${w * 0.65},${h * 0.3}" fill="none" stroke="#c89060" stroke-width="3" stroke-linecap="round"/>`;
    return svgBase(w, h, c, 'XIX', 'THE SUN');
}

function drawJudgement(w: number, h: number): string {
    const c = `<rect x="0" y="${h * 0.6}" width="${w}" height="${h * 0.4}" fill="#4a6880" opacity="0.2"/>`
        + `<path d="M${w * 0.2},${h * 0.55} L${w * 0.35},${h * 0.4} L${w * 0.5},${h * 0.5} L${w * 0.65},${h * 0.38} L${w * 0.8},${h * 0.52} L${w},${h * 0.6} L${w},${h} L0,${h}Z" fill="#506070" opacity="0.3"/>`
        + `<ellipse cx="${w * 0.5}" cy="${h * 0.18}" rx="${w * 0.25}" ry="${h * 0.08}" fill="#d0d8e0" opacity="0.3"/>`
        + catHead(w * 0.5, h * 0.15, w * 0.2, '#f0e8d8')
        + `<path d="M${w * 0.3},${h * 0.12} Q${w * 0.2},${h * 0.05} ${w * 0.15},${h * 0.15}" fill="#e8e0f0" opacity="0.4"/>`
        + `<path d="M${w * 0.7},${h * 0.12} Q${w * 0.8},${h * 0.05} ${w * 0.85},${h * 0.15}" fill="#e8e0f0" opacity="0.4"/>`
        + `<line x1="${w * 0.58}" y1="${h * 0.12}" x2="${w * 0.72}" y2="${h * 0.08}" stroke="#c9a84c" stroke-width="2"/>`
        + `<polygon points="${w * 0.72},${h * 0.06} ${w * 0.78},${h * 0.08} ${w * 0.72},${h * 0.1}" fill="#c9a84c"/>`
        + `<rect x="${w * 0.2}" y="${h * 0.62}" width="${w * 0.15}" height="${h * 0.1}" rx="2" fill="#8a7050" opacity="0.6"/>`
        + catHead(w * 0.28, h * 0.58, w * 0.12, '#c89060')
        + `<rect x="${w * 0.55}" y="${h * 0.64}" width="${w * 0.15}" height="${h * 0.1}" rx="2" fill="#8a7050" opacity="0.6"/>`
        + catHead(w * 0.63, h * 0.6, w * 0.12, '#808070');
    return svgBase(w, h, c, 'XX', 'JUDGEMENT');
}

function drawWorld(w: number, h: number): string {
    const c = ''
        // Wreath
        + `<ellipse cx="${w * 0.5}" cy="${h * 0.46}" rx="${w * 0.35}" ry="${h * 0.35}" fill="none" stroke="#508030" stroke-width="6" opacity="0.6"/>`
        + `<ellipse cx="${w * 0.5}" cy="${h * 0.46}" rx="${w * 0.33}" ry="${h * 0.33}" fill="none" stroke="#6a9838" stroke-width="3" opacity="0.4"/>`
        // Ribbon
        + `<path d="M${w * 0.5},${h * 0.11} Q${w * 0.55},${h * 0.08} ${w * 0.6},${h * 0.1}" fill="none" stroke="#c04050" stroke-width="2"/>`
        + `<path d="M${w * 0.5},${h * 0.81} Q${w * 0.55},${h * 0.84} ${w * 0.6},${h * 0.82}" fill="none" stroke="#c04050" stroke-width="2"/>`
        // Dancing cat in center
        + `<ellipse cx="${w * 0.5}" cy="${h * 0.45}" rx="${w * 0.1}" ry="${w * 0.14}" fill="#f0e8d8"/>`
        + catHead(w * 0.5, h * 0.3, w * 0.22, '#f0e8d8')
        + `<line x1="${w * 0.42}" y1="${h * 0.38}" x2="${w * 0.32}" y2="${h * 0.32}" stroke="#f0e8d8" stroke-width="3" stroke-linecap="round"/>`
        + `<line x1="${w * 0.58}" y1="${h * 0.38}" x2="${w * 0.68}" y2="${h * 0.32}" stroke="#f0e8d8" stroke-width="3" stroke-linecap="round"/>`
        + `<line x1="${w * 0.32}" y1="${h * 0.32}" x2="${w * 0.28}" y2="${h * 0.28}" stroke="#8a6820" stroke-width="2"/>`
        + `<line x1="${w * 0.68}" y1="${h * 0.32}" x2="${w * 0.72}" y2="${h * 0.28}" stroke="#8a6820" stroke-width="2"/>`
        // Scarf
        + `<path d="M${w * 0.42},${h * 0.35} Q${w * 0.35},${h * 0.5} ${w * 0.4},${h * 0.6}" fill="none" stroke="#c04070" stroke-width="2" opacity="0.6"/>`
        + `<path d="M${w * 0.58},${h * 0.35} Q${w * 0.65},${h * 0.5} ${w * 0.6},${h * 0.6}" fill="none" stroke="#4080c0" stroke-width="2" opacity="0.6"/>`
        // Corner creatures (cat versions)
        + catHead(w * 0.1, h * 0.08, w * 0.1, '#c89060') // eagle-cat
        + catHead(w * 0.9, h * 0.08, w * 0.1, '#c89060') // human-cat
        + catHead(w * 0.1, h * 0.88, w * 0.1, '#808070') // bull-cat
        + catHead(w * 0.9, h * 0.88, w * 0.1, '#2a2028'); // lion-cat
    return svgBase(w, h, c, 'XXI', 'THE WORLD');
}

// ══════════════════════════════════════════════════════════
// MINOR ARCANA (Cat version)
// ══════════════════════════════════════════════════════════

function drawSuitSymbol(cx: number, cy: number, suit: string, size: number): string {
    const sc = SUIT_CONFIG[suit];
    if (suit === 'Wands') {
        // Stick with yarn ball
        return `<line x1="${cx}" y1="${cy - size * 0.7}" x2="${cx}" y2="${cy + size * 0.7}" stroke="${sc.color}" stroke-width="${size * 0.15}" stroke-linecap="round"/>`
            + `<circle cx="${cx}" cy="${cy - size * 0.7}" r="${size * 0.2}" fill="${sc.color}" opacity="0.7"/>`
            + `<circle cx="${cx}" cy="${cy - size * 0.7}" r="${size * 0.1}" fill="${sc.colorDim}"/>`;
    }
    if (suit === 'Cups') {
        // Fish bowl
        return `<ellipse cx="${cx}" cy="${cy}" rx="${size * 0.35}" ry="${size * 0.4}" fill="${sc.color}" opacity="0.3" stroke="${sc.color}" stroke-width="${size * 0.06}"/>`
            + `<ellipse cx="${cx}" cy="${cy - size * 0.15}" rx="${size * 0.2}" ry="${size * 0.08}" fill="#80c0ff" opacity="0.4"/>`
            + `<circle cx="${cx + size * 0.05}" cy="${cy + size * 0.05}" r="${size * 0.08}" fill="#e08040" opacity="0.5"/>`;
    }
    if (suit === 'Swords') {
        // Claw scratch marks
        return `<line x1="${cx - size * 0.2}" y1="${cy - size * 0.5}" x2="${cx + size * 0.1}" y2="${cy + size * 0.5}" stroke="${sc.color}" stroke-width="${size * 0.08}" stroke-linecap="round"/>`
            + `<line x1="${cx}" y1="${cy - size * 0.5}" x2="${cx + size * 0.2}" y2="${cy + size * 0.5}" stroke="${sc.color}" stroke-width="${size * 0.06}" stroke-linecap="round" opacity="0.7"/>`
            + `<line x1="${cx + size * 0.15}" y1="${cy - size * 0.4}" x2="${cx + size * 0.3}" y2="${cy + size * 0.4}" stroke="${sc.color}" stroke-width="${size * 0.05}" stroke-linecap="round" opacity="0.5"/>`;
    }
    // Pentacles — paw print coin
    return `<circle cx="${cx}" cy="${cy}" r="${size * 0.45}" fill="none" stroke="${sc.color}" stroke-width="${size * 0.08}"/>`
        + `<circle cx="${cx}" cy="${cy}" r="${size * 0.35}" fill="${sc.color}" opacity="0.15"/>`
        + pawPrint(cx, cy, size * 0.25, sc.color, 0.6);
}

function drawMinorCard(w: number, h: number, suit: string, value: number, displayName: string): string {
    const sc = SUIT_CONFIG[suit];
    const valueLabels: Record<number, string> = { 1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'Pg', 12: 'Kn', 13: 'Q', 14: 'K' };
    const valText = valueLabels[value] || String(value);

    const defs = `<defs><radialGradient id="cmbg_${suit}_${value}" cx="50%" cy="35%">`
        + `<stop offset="0%" stop-color="#e0d4c0"/>`
        + `<stop offset="100%" stop-color="${sc.bgGrad[0]}"/>`
        + `</radialGradient></defs>`;

    let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`
        + defs
        + `<rect width="${w}" height="${h}" fill="url(#cmbg_${suit}_${value})"/>`;

    svg += `<rect x="5" y="5" width="${w - 10}" height="${h - 10}" fill="none" stroke="${sc.color}" stroke-width="1" rx="7" opacity="0.35"/>`;
    svg += `<text x="16" y="26" font-family="serif" font-size="${w * 0.1}" fill="${sc.color}" font-weight="bold">${valText}</text>`;
    svg += `<text x="${w - 16}" y="${h - 14}" font-family="serif" font-size="${w * 0.1}" fill="${sc.color}" text-anchor="end" font-weight="bold" transform="rotate(180,${w - 16},${h - 18})">${valText}</text>`;
    svg += drawSuitSymbol(18, 38, suit, w * 0.08);

    if (value >= 1 && value <= 10) {
        const cx = w / 2;
        if (value === 1) {
            svg += drawSuitSymbol(cx, h * 0.45, suit, w * 0.35);
            svg += catSitting(cx, h * 0.7, w * 0.2, '#808070' as CatColor);
        } else {
            const pipSize = w * 0.12;
            const midX = w / 2, topY = h * 0.18, botY = h * 0.73, midY = h * 0.455;
            const leftX = w * 0.3, rightX = w * 0.7;
            let positions: number[][] = [];
            if (value === 2) positions = [[midX, topY + 15], [midX, botY - 15]];
            else if (value === 3) positions = [[midX, topY + 15], [midX, midY], [midX, botY - 15]];
            else if (value === 4) positions = [[leftX, topY + 15], [rightX, topY + 15], [leftX, botY - 15], [rightX, botY - 15]];
            else if (value === 5) positions = [[leftX, topY + 15], [rightX, topY + 15], [midX, midY], [leftX, botY - 15], [rightX, botY - 15]];
            else if (value === 6) positions = [[leftX, topY + 15], [rightX, topY + 15], [leftX, midY], [rightX, midY], [leftX, botY - 15], [rightX, botY - 15]];
            else if (value === 7) positions = [[leftX, topY + 15], [rightX, topY + 15], [leftX, midY], [midX, h * 0.35], [rightX, midY], [leftX, botY - 15], [rightX, botY - 15]];
            else if (value === 8) positions = [[leftX, topY + 15], [rightX, topY + 15], [leftX, h * 0.35], [rightX, h * 0.35], [leftX, h * 0.56], [rightX, h * 0.56], [leftX, botY - 15], [rightX, botY - 15]];
            else if (value === 9) positions = [[leftX, topY + 15], [rightX, topY + 15], [leftX, h * 0.32], [rightX, h * 0.32], [midX, midY], [leftX, h * 0.58], [rightX, h * 0.58], [leftX, botY - 15], [rightX, botY - 15]];
            else if (value === 10) positions = [[leftX, topY + 15], [rightX, topY + 15], [leftX, h * 0.3], [rightX, h * 0.3], [midX, h * 0.37], [midX, h * 0.53], [leftX, h * 0.6], [rightX, h * 0.6], [leftX, botY - 15], [rightX, botY - 15]];
            for (const p of positions) {
                svg += drawSuitSymbol(p[0], p[1], suit, pipSize);
            }
        }
    } else {
        const cx = w / 2;
        svg += `<g opacity="0.1">` + drawSuitSymbol(cx, h * 0.46, suit, w * 0.5) + `</g>`;
        if (value === 11) {
            svg += catSitting(cx, h * 0.35, w * 0.3, '#c89060' as CatColor); // kitten
        } else if (value === 12) {
            svg += catSitting(cx, h * 0.35, w * 0.35, '#808070' as CatColor); // athletic cat
        } else if (value === 13) {
            svg += catSitting(cx, h * 0.35, w * 0.35, '#f0e8d8' as CatColor); // elegant
            svg += `<rect x="${cx - w * 0.08}" y="${h * 0.16}" width="${w * 0.16}" height="${h * 0.025}" rx="1" fill="#c9a84c"/>`;
            svg += `<polygon points="${cx - w * 0.04},${h * 0.16} ${cx},${h * 0.14} ${cx + w * 0.04},${h * 0.16}" fill="#c9a84c"/>`;
        } else if (value === 14) {
            svg += catSitting(cx, h * 0.35, w * 0.38, '#2a2028' as CatColor); // majestic
            svg += `<rect x="${cx - w * 0.1}" y="${h * 0.14}" width="${w * 0.2}" height="${h * 0.03}" rx="2" fill="#c9a84c"/>`;
            svg += `<polygon points="${cx - w * 0.06},${h * 0.14} ${cx - w * 0.02},${h * 0.1} ${cx + w * 0.02},${h * 0.14} ${cx + w * 0.06},${h * 0.1} ${cx + w * 0.1},${h * 0.14}" fill="#c9a84c"/>`;
            svg += `<circle cx="${cx}" cy="${h * 0.11}" r="${w * 0.015}" fill="#ff4040"/>`;
        }
    }

    svg += `<rect x="0" y="${h - 28}" width="${w}" height="28" fill="rgba(30,20,10,0.75)"/>`;
    svg += `<text x="${w / 2}" y="${h - 10}" font-family="serif" font-size="${w * 0.06}" fill="#c9a84c" text-anchor="middle" font-weight="bold" letter-spacing="0.5">${displayName.toUpperCase()}</text>`;
    svg += '</svg>';
    return svg;
}

// ══════════════════════════════════════════════════════════
// MAJOR ARCANA MAP
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
    const majorDraw = MAJOR_DRAW_MAP[cardName];
    if (majorDraw) return majorDraw(w, h);

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
