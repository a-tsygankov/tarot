import type { TraitValueMap } from '@shared/contracts/api-contracts.js';

const MAX_PROMPT_TEXT_LENGTH = 800;
const MAX_TRAIT_VALUE_LENGTH = 200;

export function sanitizeUserText(input: string | null | undefined, maxLength = MAX_PROMPT_TEXT_LENGTH): string | null {
    if (typeof input !== 'string') {
        return null;
    }

    const sanitized = input
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!sanitized) {
        return null;
    }

    return sanitized.slice(0, maxLength);
}

export function sanitizeTraitMap(traits: TraitValueMap | null | undefined): TraitValueMap {
    if (!traits || typeof traits !== 'object') {
        return {};
    }

    const clean: TraitValueMap = {};
    for (const [rawKey, rawValues] of Object.entries(traits)) {
        const key = rawKey
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .replace(/_{2,}/g, '_')
            .replace(/^_+|_+$/g, '')
            .toLowerCase()
            .slice(0, 60);
        const values = (Array.isArray(rawValues) ? rawValues : [rawValues])
            .map(value => sanitizeUserText(String(value), MAX_TRAIT_VALUE_LENGTH))
            .filter((value): value is string => Boolean(value));
        if (key && values.length > 0) {
            clean[key] = Array.from(new Set(values));
        }
    }
    return clean;
}

export function mergeTraitMaps(
    current: TraitValueMap | null | undefined,
    incoming: TraitValueMap | null | undefined,
): TraitValueMap {
    const merged = sanitizeTraitMap(current);
    for (const [key, values] of Object.entries(sanitizeTraitMap(incoming))) {
        merged[key] = Array.from(new Set([...(merged[key] ?? []), ...values]));
    }
    return merged;
}

export function formatTraitSummary(traits: TraitValueMap | null | undefined): string {
    const clean = sanitizeTraitMap(traits);
    const parts = Object.entries(clean).map(([key, values]) => `${key.replace(/_/g, ' ')}: ${values.join(', ')}`);
    return parts.length > 0 ? parts.join(' | ') : 'No personal traits known.';
}

export function formatPromptField(label: string, value: string | null | undefined): string | null {
    const sanitized = sanitizeUserText(value);
    if (!sanitized) {
        return null;
    }

    return `${label}:\n<<<USER_INPUT>>>\n${sanitized}\n<<<END_USER_INPUT>>>`;
}
