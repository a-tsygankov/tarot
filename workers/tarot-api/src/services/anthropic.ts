import type { Env } from '../env.js';
import { WORKER_CONFIG, getTokenBudget } from '../config.js';

/**
 * Anthropic API caller — used as fallback when Gemini fails.
 */
export async function callAnthropic(
    env: Env,
    prompt: string,
    turnCount: number,
): Promise<{ text: string; model: string }> {
    const budget = getTokenBudget(turnCount);
    const model = WORKER_CONFIG.ai.models.anthropic.default;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': env.ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            max_tokens: budget.responseMax,
            messages: [{ role: 'user', content: prompt }],
        }),
    });

    if (!response.ok) {
        throw new Error(`Anthropic ${model}: ${response.status}`);
    }

    const data = await response.json() as {
        content?: Array<{ type: string; text?: string }>;
    };

    const text = data.content?.find(c => c.type === 'text')?.text;
    if (!text) throw new Error(`Anthropic ${model}: empty response`);

    return { text, model };
}
