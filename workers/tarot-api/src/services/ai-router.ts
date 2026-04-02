import type { Env } from '../env.js';
import { callGemini } from './gemini.js';
import { callAnthropic } from './anthropic.js';

/**
 * AI router: tries Gemini first, falls back to Anthropic.
 * Returns the raw text and provider/model metadata.
 */
export async function callAI(
    env: Env,
    prompt: string,
    turnCount: number,
): Promise<{ text: string; provider: string; model: string }> {
    try {
        const result = await callGemini(env, prompt, turnCount);
        return { text: result.text, provider: 'gemini', model: result.model };
    } catch (geminiErr) {
        console.warn('Gemini failed, trying Anthropic:', geminiErr);

        try {
            const result = await callAnthropic(env, prompt, turnCount);
            return { text: result.text, provider: 'anthropic', model: result.model };
        } catch (anthropicErr) {
            console.error('Both AI providers failed');
            throw new Error(
                `AI routing failed. Gemini: ${geminiErr}. Anthropic: ${anthropicErr}`
            );
        }
    }
}
