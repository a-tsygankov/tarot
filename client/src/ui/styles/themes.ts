/**
 * Theme definitions — CSS custom property overrides.
 * The default "dusk" theme is in index.html :root.
 */

export interface Theme {
    id: string;
    label: string;
    vars: Record<string, string>;
}

export const THEMES: Theme[] = [
    {
        id: 'dusk',
        label: 'Dusk',
        vars: {
            '--bg': '#1a1728',
            '--bg-deep': '#110e1c',
            '--bg-card': '#231e35',
            '--gold': '#c9a84c',
            '--gold-light': '#f0d878',
            '--gold-dim': '#7a6530',
            '--purple': '#6b5fa0',
            '--purple-dim': '#3d3560',
            '--purple-light': '#9b8fd0',
            '--text': '#e8e0d0',
            '--text-dim': '#8a7f9a',
            '--text-faint': '#4a4460',
            '--border': 'rgba(201,168,76,0.18)',
            '--border-bright': 'rgba(201,168,76,0.5)',
            '--accent': '#c8607a',
        },
    },
    {
        id: 'midnight',
        label: 'Midnight',
        vars: {
            '--bg': '#0d1117',
            '--bg-deep': '#010409',
            '--bg-card': '#161b22',
            '--gold': '#58a6ff',
            '--gold-light': '#79c0ff',
            '--gold-dim': '#1f6feb',
            '--purple': '#8b949e',
            '--purple-dim': '#30363d',
            '--purple-light': '#c9d1d9',
            '--text': '#c9d1d9',
            '--text-dim': '#8b949e',
            '--text-faint': '#484f58',
            '--border': 'rgba(88,166,255,0.18)',
            '--border-bright': 'rgba(88,166,255,0.5)',
            '--accent': '#f78166',
        },
    },
    {
        id: 'parchment',
        label: 'Parchment',
        vars: {
            '--bg': '#f4efe6',
            '--bg-deep': '#ebe3d5',
            '--bg-card': '#faf7f0',
            '--gold': '#8b6914',
            '--gold-light': '#b8941e',
            '--gold-dim': '#5c4610',
            '--purple': '#6b5050',
            '--purple-dim': '#c4b3a0',
            '--purple-light': '#4a3636',
            '--text': '#2e2418',
            '--text-dim': '#6b5d4f',
            '--text-faint': '#b0a090',
            '--border': 'rgba(139,105,20,0.2)',
            '--border-bright': 'rgba(139,105,20,0.5)',
            '--accent': '#a0442e',
        },
    },
    {
        id: 'forest',
        label: 'Forest',
        vars: {
            '--bg': '#1a2318',
            '--bg-deep': '#0f1610',
            '--bg-card': '#222e20',
            '--gold': '#8fae5a',
            '--gold-light': '#b4d87a',
            '--gold-dim': '#5a7030',
            '--purple': '#5a7a6a',
            '--purple-dim': '#2a3a30',
            '--purple-light': '#7aaa8a',
            '--text': '#d0dcc8',
            '--text-dim': '#7a8a70',
            '--text-faint': '#3a4a35',
            '--border': 'rgba(143,174,90,0.18)',
            '--border-bright': 'rgba(143,174,90,0.5)',
            '--accent': '#cc7a4a',
        },
    },
];

export function applyTheme(themeId: string): void {
    const theme = THEMES.find(t => t.id === themeId);
    if (!theme) return;
    const root = document.documentElement;
    for (const [prop, value] of Object.entries(theme.vars)) {
        root.style.setProperty(prop, value);
    }
    localStorage.setItem('tarot-theme', themeId);
}

export function restoreTheme(): string {
    const saved = localStorage.getItem('tarot-theme') ?? 'dusk';
    applyTheme(saved);
    return saved;
}
