import type { Env } from '../env.js';
import { WORKER_CONFIG, getTokenBudget } from '../config.js';

/**
 * Gemini API caller with retry and model fallback.
 */
export async function callGemini(
    env: Env,
    prompt: string,
    turnCount: number,
): Promise<{ text: string; model: string }> {
    const budget = getTokenBudget(turnCount);
    const models = [
        WORKER_CONFIG.ai.models.gemini.fast,
        WORKER_CONFIG.ai.models.gemini.quality,
    ];

    let lastError: Error | null = null;

    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_KEY}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        maxOutputTokens: budget.responseMax,
                        temperature: 0.9,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error(`Gemini ${model}: ${response.status}`);
            }

            const data = await response.json() as {
                candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };

            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error(`Gemini ${model}: empty response`);

            return { text, model };
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            console.warn(`Gemini ${model} failed:`, lastError.message);
        }
    }

    throw lastError ?? new Error('Gemini: all models failed');
}
