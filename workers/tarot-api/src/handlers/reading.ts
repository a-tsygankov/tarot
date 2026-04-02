import type { Env } from '../env.js';
import type { ReadingRequest } from '@shared/contracts/api-contracts.js';
import { callAI } from '../services/ai-router.js';
import { buildReadingPrompt } from '../prompts.js';
import { parseReadingResponse } from '../services/response-parser.js';
import type { R2GameRepository } from '../repositories/game-repository.js';
import type { R2UserRepository } from '../repositories/user-repository.js';
import type { R2AnalyticsRepository } from '../repositories/analytics-repository.js';
import type { IndexWriter } from '../services/index-writer.js';

export interface ReadingDeps {
    games: R2GameRepository;
    users: R2UserRepository;
    analytics: R2AnalyticsRepository;
    indexWriter: IndexWriter;
}

/**
 * POST /api/reading — AI reading with 3-part distillation.
 */
export async function handleReading(request: Request, env: Env, deps: ReadingDeps): Promise<Response> {
    const startTime = Date.now();

    try {
        const body = await request.json() as ReadingRequest;
        const { userContext, gameContext } = body;

        // Build user summary for prompt
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

        // Build game context for prompt
        const cardList = gameContext.cards
            .map(c => `${c.position}: ${c.name}${c.reversed ? ' (Rev)' : ''}`)
            .join(', ');
        let gameCtx = `${gameContext.spreadType}-card spread.\nCARDS: ${cardList}`;
        if (gameContext.readingDigest) {
            gameCtx += '\nREADING SUMMARY: ' + gameContext.readingDigest;
        }

        const prompt = buildReadingPrompt(
            userSummary,
            gameCtx,
            gameContext.question,
            userContext.tone,
            userContext.language,
        );

        const aiResult = await callAI(env, prompt, gameContext.turnCount);
        const parsed = parseReadingResponse(aiResult.text, aiResult.provider, aiResult.model);

        const responseTime = Date.now() - startTime;

        // ── R2 persistence (fire-and-forget for non-critical writes) ──
        const now = new Date();
        const date = now.toISOString().slice(0, 10);

        // Create or update game doc with reading
        const existingGame = await deps.games.getGame(gameContext.gameId);
        if (!existingGame) {
            await deps.games.createGame({
                gameId: gameContext.gameId,
                uid: userContext.uid,
                sessionId: userContext.sessionId,
                spreadType: gameContext.spreadType,
                cards: gameContext.cards.map(c => ({
                    position: c.position,
                    name: c.name,
                    reversed: c.reversed,
                })),
                question: gameContext.question,
                topic: gameContext.topic,
                language: userContext.language,
                tone: userContext.tone,
            });
        }
        await deps.games.applyReading(
            gameContext.gameId,
            parsed.reading as unknown as Record<string, unknown>,
            parsed.contextUpdate,
        );

        // Write turn document
        await deps.games.writeTurn({
            gameId: gameContext.gameId,
            uid: userContext.uid,
            turnNumber: gameContext.turnCount + 1,
            turnType: 'reading',
            question: gameContext.question,
            questionDigest: null,
            answerText: aiResult.text,
            answerDigest: parsed.contextUpdate,
            userContextDelta: parsed.userContextDelta as unknown as Record<string, unknown>,
            aiProvider: aiResult.provider,
            aiModel: aiResult.model,
            responseTimeMs: responseTime,
            tokenBudgetUsed: 0,
        });

        // Update user stats + indexes (best-effort)
        deps.users.incrementStat(userContext.uid, 'totalReadings').catch(() => {});
        deps.indexWriter.addUserGame(userContext.uid, gameContext.gameId).catch(() => {});
        deps.indexWriter.addDateGame(date, gameContext.gameId).catch(() => {});
        deps.indexWriter.trackActiveUser(date, userContext.uid).catch(() => {});
        deps.analytics.incrementDaily(date, {
            readings: 1,
            language: userContext.language,
        }).catch(() => {});

        console.log(`Reading completed in ${responseTime}ms via ${aiResult.provider}/${aiResult.model}`);

        return Response.json(parsed);
    } catch (err) {
        console.error('Reading handler error:', err);
        return Response.json(
            { error: 'Reading failed', message: String(err) },
            { status: 500 },
        );
    }
}
