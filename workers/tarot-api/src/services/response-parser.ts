import type { ReadingResponse, FollowUpResponse } from '@shared/contracts/api-contracts.js';

/**
 * Parse AI text output into structured response objects.
 * Handles JSON embedded in markdown fences or raw JSON.
 */
export function parseReadingResponse(
    raw: string,
    provider: string,
    model: string,
): ReadingResponse {
    const json = extractJson(raw);
    const parsed = JSON.parse(json);

    if (!parsed.reading || !parsed.contextUpdate) {
        throw new Error('Invalid reading response: missing required fields');
    }

    return {
        reading: parsed.reading,
        contextUpdate: parsed.contextUpdate,
        userContextDelta: parsed.userContextDelta ?? {
            name: null, gender: null, birthdate: null, location: null, traits: {},
        },
        provider,
        model,
    };
}

export function parseFollowUpResponse(raw: string): FollowUpResponse {
    const json = extractJson(raw);
    const parsed = JSON.parse(json);

    if (!parsed.answer || !parsed.questionDigest || !parsed.answerDigest) {
        throw new Error('Invalid follow-up response: missing required fields');
    }

    return {
        answer: parsed.answer,
        questionDigest: parsed.questionDigest,
        answerDigest: parsed.answerDigest,
        userContextDelta: parsed.userContextDelta ?? null,
    };
}

/**
 * Extract JSON from raw AI output.
 * Handles: raw JSON, ```json fenced, ``` fenced.
 */
function extractJson(raw: string): string {
    const trimmed = raw.trim();

    // Try raw JSON first
    if (trimmed.startsWith('{')) return trimmed;

    // Try markdown-fenced JSON
    const fencedMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (fencedMatch) return fencedMatch[1].trim();

    // Last resort: find first { to last }
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end > start) {
        return trimmed.slice(start, end + 1);
    }

    throw new Error('Could not extract JSON from AI response');
}
