/**
 * Single source of truth for user-selectable reading fonts.
 *
 * Consumed by:
 *   - settings-panel.ts (buttons)
 *   - main.ts (restore on boot)
 *   - ReadingImageExporter.ts (canvas text)
 */

export interface FontOption {
    readonly id: string;
    readonly label: string;
    readonly family: string;
}

export const FONT_OPTIONS: readonly FontOption[] = [
    { id: 'Palatino',    label: 'Palatino',    family: "'Palatino Linotype', Palatino, Georgia, serif" },
    { id: 'Garamond',    label: 'Garamond',    family: "'EB Garamond', Garamond, serif" },
    { id: 'Cinzel',      label: 'Cinzel',      family: "Cinzel, serif" },
    { id: 'Helvetica',   label: 'Helvetica',   family: "Helvetica, 'Helvetica Neue', Arial, sans-serif" },
    { id: 'Philosopher', label: 'Philosopher', family: "Philosopher, serif" },
] as const;

export const FONT_SIZE_OPTIONS = [
    { id: 'small',  label: 'S',  value: '0.85em' },
    { id: 'medium', label: 'M',  value: '1em' },
    { id: 'large',  label: 'L',  value: '1.15em' },
    { id: 'xlarge', label: 'XL', value: '1.3em' },
] as const;

export const DEFAULT_FONT_ID = 'Palatino';
export const DEFAULT_FONT_SIZE_ID = 'medium';

/** Resolve a font id to its CSS font-family string, with a stable fallback. */
export function resolveFontFamily(fontId: string | null | undefined): string {
    const match = FONT_OPTIONS.find(f => f.id === fontId);
    return match?.family ?? FONT_OPTIONS[0].family;
}

/** Resolve a font-size id to its CSS size value, with a stable fallback. */
export function resolveFontSize(sizeId: string | null | undefined): string {
    const match = FONT_SIZE_OPTIONS.find(s => s.id === sizeId);
    return match?.value ?? '1em';
}
