import type { Env } from '../env.js';
import type { FollowUpRequest } from '@shared/contracts/api-contracts.js';
import { callAI } from '../services/ai-router.js';
import { buildFollowUpPrompt } from '../prompts.js';
import { parseFollowUpResponse } from '../services/response-parser.js';
import type { R2GameRepository } from '../repositories/game-repository.js';
import type { R2UserRepository } from '../repositories/user-repository.js';
import type { R2AnalyticsRepository } from '../repositories/analytics-repository.js';
import type { IndexWriter } from '../services/index-writer.js';

export interface FollowUpDeps {
    games: R2GameRepository;
    users: R2UserRepository;
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

        // Build user summary
        const userParts: string[] = [];
        if (userContext.name) userParts.push('Name: ' + userContext.name);
        if (userContext.gender) userParts.push('Gender: ' + userContext.gender);
        if (userContext.location) userParts.push('Location: ' + userContext.location);
        for (const [k, v] of Object.entries(userContext.traits || {})) {
            userParts.push(k.replace(/_/g, ' ') + ': ' + v);
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
            question,
            userContext.tone,
            userContext.language,
        );

        const aiResult = await callAI(env, prompt, gameContext.turnCount);
        const parsed = parseFollowUpResponse(aiResult.text);

        const responseTime = Date.now() - startTime;

        // ── R2 persistence ──
        const date = new Date().toISOString().slice(0, 10);

        await deps.games.incrementTurnCount(gameContext.gameId);

        await deps.games.writeTurn({
            gameId: gameContext.gameId,
            uid: userContext.uid,
            turnNumber: gameContext.turnCount + 1,
            turnType: 'followup',
            question,
            questionDigest: parsed.questionDigest,
            answerText: parsed.answer,
            answerDigest: parsed.answerDigest,
            userContextDelta: parsed.userContextDelta as Record<string, unknown> | null,
            aiProvider: aiResult.provider,
            aiModel: aiResult.model,
            responseTimeMs: responseTime,
            tokenBudgetUsed: 0,
        });

        // Best-effort analytics
        deps.users.incrementStat(userContext.uid, 'totalFollowUps').catch(() => {});
        deps.indexWriter.trackActiveUser(date, userContext.uid).catch(() => {});
        deps.analytics.incrementDaily(date, {
            followUps: 1,
            language: userContext.language,
        }).catch(() => {});

        console.log(`Follow-up completed in ${responseTime}ms via ${aiResult.provider}/${aiResult.model}`);

        return Response.json(parsed);
    } catch (err) {
        console.error('Follow-up handler error:', err);
        return Response.json(
            { error: 'Follow-up failed', message: String(err) },
            { status: 500 },
        );
    }
}
