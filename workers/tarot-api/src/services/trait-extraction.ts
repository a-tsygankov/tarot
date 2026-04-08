import type { TraitValueMap } from '@shared/contracts/api-contracts.js';
import type { Env } from '../env.js';
import { buildTraitExtractionPrompt } from '../prompts.js';
import { callAI } from './ai-router.js';
import { formatTraitSummary, sanitizeTraitMap, sanitizeUserText } from './prompt-safety.js';
import { parseTraitExtractionResponse } from './response-parser.js';

export async function extractTraitsFromUserInput(
    env: Env,
    params: {
        language: string;
        existingTraits: TraitValueMap;
        inputLabel: string;
        inputText: string | null;
    },
): Promise<TraitValueMap> {
    const sanitizedInput = sanitizeUserText(params.inputText);
    if (!sanitizedInput) {
        return {};
    }

    const prompt = buildTraitExtractionPrompt(
        params.language,
        formatTraitSummary(params.existingTraits),
        params.inputLabel,
        sanitizedInput,
    );
    const result = await callAI(env, prompt, 0);
    return sanitizeTraitMap(parseTraitExtractionResponse(result.text));
}
