import type { Env } from '../env.js';
import { callGemini } from './gemini.js';
import { callAnthropic } from './anthropic.js';

/**
 * AI router: tries available providers in order.
 * Skips providers without configured API keys.
 * Returns the raw text and provider/model metadata.
 */
export async function callAI(
    env: Env,
    prompt: string,
    turnCount: number,
): Promise<{ text: string; provider: string; model: string }> {
    const errors: string[] = [];

    // Try Gemini if key is available
    if (env.GEMINI_KEY) {
        try {
            const result = await callGemini(env, prompt, turnCount);
            return { text: result.text, provider: 'gemini', model: result.model };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`Gemini: ${msg}`);
            console.warn('Gemini failed, trying fallback:', msg);
        }
    } else {
        errors.push('Gemini: no API key configured');
        console.warn('Gemini skipped: GEMINI_KEY not set');
    }

    // Try Anthropic if key is available
    if (env.ANTHROPIC_KEY) {
        try {
            const result = await callAnthropic(env, prompt, turnCount);
            return { text: result.text, provider: 'anthropic', model: result.model };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`Anthropic: ${msg}`);
            console.error('Anthropic also failed:', msg);
        }
    } else {
        errors.push('Anthropic: no API key configured');
        console.warn('Anthropic skipped: ANTHROPIC_KEY not set');
    }

    throw new Error(`All AI providers failed. ${errors.join(' | ')}`);
}
