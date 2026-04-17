import type { Env } from '../env.js';
import type { FollowUpRequest } from '@shared/contracts/api-contracts.js';
import { callAI } from '../services/ai-router.js';
import { buildFollowUpPrompt } from '../prompts.js';
import { parseFollowUpResponse } from '../services/response-parser.js';
import { formatPromptField, formatTraitSummary, sanitizeTraitMap, sanitizeUserText } from '../services/prompt-safety.js';
import type { R2GameRepository } from '../repositories/game-repository.js';
import type { R2UserRepository } from '../repositories/user-repository.js';
import type { R2UserTraitsRepository } from '../repositories/user-traits-repository.js';
import type { R2AnalyticsRepository } from '../repositories/analytics-repository.js';
import type { IndexWriter } from '../services/index-writer.js';
import { extractTraitsFromUserInput } from '../services/trait-extraction.js';

export interface FollowUpDeps {
    games: R2GameRepository;
    users: R2UserRepository;
    userTraits: R2UserTraitsRepository;
    analytics: R2AnalyticsRepository;
    indexWriter: IndexWriter;
}

/**
 * POST /api/followup — follow-up Q&A with context distillation.
 */
export async function handleFollowUp(request: Request, env: Env, deps: FollowUpDeps): Promise<Response> {
    const startTime = Date.now();

    try {
        const body = await request.json() as FollowUpRequest;
        const { userContext, gameContext, question } = body;
        const sanitizedQuestion = sanitizeUserText(question);
        if (!sanitizedQuestion) {
            return Response.json({ error: 'Follow-up failed', message: 'Question is required' }, { status: 400 });
        }
        const sanitizedOriginalQuestion = sanitizeUserText(gameContext.question);
        const sanitizedTopic = sanitizeUserText(gameContext.topic, 120);
        const sanitizedName = sanitizeUserText(userContext.name, 120);
        const sanitizedGender = sanitizeUserText(userContext.gender, 60);
        const sanitizedBirthdate = sanitizeUserText(userContext.birthdate, 60);
        const sanitizedLocation = sanitizeUserText(userContext.location, 120);
        let updatedTraitsDoc = await deps.userTraits.ensureForUser(userContext.uid);
        const sanitizedTraits = sanitizeTraitMap(updatedTraitsDoc.traits);

        // Build user summary
        const userParts: string[] = [];
        if (sanitizedName) userParts.push('Name: ' + sanitizedName);
        if (sanitizedGender) userParts.push('Gender: ' + sanitizedGender);
        if (sanitizedBirthdate) userParts.push('Birthdate: ' + sanitizedBirthdate);
        if (sanitizedLocation) userParts.push('Location: ' + sanitizedLocation);
        const traitsSummary = formatTraitSummary(sanitizedTraits);
        if (traitsSummary !== 'No personal traits known.') {
            userParts.push(traitsSummary);
        }
        const userSummary = userParts.length > 0
            ? userParts.join(' | ')
            : 'No personal details known.';

        // Build game context
        const cardList = gameContext.cards
            .map(c => `${c.position}: ${c.name}${c.reversed ? ' (Rev)' : ''}`)
            .join(', ');

        let gameCtx = `${gameContext.spreadType}-card spread.\nCARDS: ${cardList}`;
        if (gameContext.readingDigest) {
            gameCtx += '\nREADING SUMMARY: ' + gameContext.readingDigest;
        }
        if (gameContext.qaDigests.length > 0) {
            gameCtx += '\nCONVERSATION HISTORY (digests):';
            for (const qa of gameContext.qaDigests) {
                gameCtx += `\n  ${qa.role.toUpperCase()}: ${qa.digest}`;
            }
        }

        const prompt = buildFollowUpPrompt(
            userSummary,
            gameCtx,
            formatPromptField('ORIGINAL TOPIC', sanitizedTopic),
            formatPromptField('ORIGINAL QUESTION', sanitizedOriginalQuestion),
            formatPromptField('SEEKER FOLLOW-UP QUESTION', sanitizedQuestion),
            userContext.tone,
            userContext.language,
        );

        const aiResult = await callAI(env, prompt, gameContext.turnCount);
        const parsed = parseFollowUpResponse(aiResult.text);
        const normalizedDelta = parsed.userContextDelta ? {
            ...parsed.userContextDelta,
            traits: {},
        } : null;

        const extractedTraits = await extractTraitsFromUserInput(env, {
            language: userContext.language,
            existingTraits: updatedTraitsDoc.traits,
            inputLabel: 'SEEKER FOLLOW-UP QUESTION',
            inputText: sanitizedQuestion,
        });
        if (Object.keys(extractedTraits).length > 0) {
            updatedTraitsDoc = await deps.userTraits.mergeForUser(userContext.uid, extractedTraits);
        }

        const responseTime = Date.now() - startTime;

        // ── R2 persistence (best-effort) ──
        try {
            const date = new Date().toISOString().slice(0, 10);

            await deps.games.incrementTurnCount(gameContext.gameId);

            await deps.games.writeTurn({
                gameId: gameContext.gameId,
                uid: userContext.uid,
                turnNumber: gameContext.turnCount + 1,
                turnType: 'followup',
                question: sanitizedQuestion,
                questionDigest: parsed.questionDigest,
                answerText: parsed.answer,
                answerDigest: parsed.answerDigest,
                userContextDelta: normalizedDelta as Record<string, unknown> | null,
                aiProvider: aiResult.provider,
                aiModel: aiResult.model,
                responseTimeMs: responseTime,
                tokenBudgetUsed: 0,
            });

            // Best-effort analytics
            deps.users.upsert(userContext.uid, {
                language: userContext.language,
                tone: userContext.tone,
                name: sanitizedName,
                gender: sanitizedGender,
                birthdate: sanitizedBirthdate,
                location: sanitizedLocation,
                userTraitsId: updatedTraitsDoc.id,
            }).catch(() => {});
            deps.users.applyContextDelta(userContext.uid, normalizedDelta ?? {}).catch(() => {});
            deps.users.incrementStat(userContext.uid, 'totalFollowUps').catch(() => {});
            deps.indexWriter.trackActiveUser(date, userContext.uid).catch(() => {});
            deps.analytics.incrementDaily(date, {
                followUps: 1,
                language: userContext.language,
            }).catch(() => {});
        } catch (persistErr) {
            console.warn('R2 persistence failed (follow-up still returned):', persistErr instanceof Error ? persistErr.message : String(persistErr));
        }

        console.log(`Follow-up completed in ${responseTime}ms via ${aiResult.provider}/${aiResult.model}`);

        return Response.json({
            ...parsed,
            userContextDelta: normalizedDelta,
            userTraits: deps.userTraits.toPayload(updatedTraitsDoc),
        });
    } catch (err) {
        console.error('Follow-up handler error:', err);
        return Response.json(
            { error: 'Follow-up failed', message: String(err) },
            { status: 500 },
        );
    }
}
