import type { Env } from '../env.js';
import type { ReadingRequest } from '@shared/contracts/api-contracts.js';
import { callAI } from '../services/ai-router.js';
import { buildReadingPrompt } from '../prompts.js';
import { parseReadingResponse } from '../services/response-parser.js';
import { formatPromptField, formatTraitSummary, sanitizeTraitMap, sanitizeUserText } from '../services/prompt-safety.js';
import type { R2GameRepository } from '../repositories/game-repository.js';
import type { R2UserRepository } from '../repositories/user-repository.js';
import type { R2UserTraitsRepository } from '../repositories/user-traits-repository.js';
import type { R2AnalyticsRepository } from '../repositories/analytics-repository.js';
import type { IndexWriter } from '../services/index-writer.js';
import { extractTraitsFromUserInput } from '../services/trait-extraction.js';

export interface ReadingDeps {
    games: R2GameRepository;
    users: R2UserRepository;
    userTraits: R2UserTraitsRepository;
    analytics: R2AnalyticsRepository;
    indexWriter: IndexWriter;
}

const PREDEFINED_TOPICS = new Set(['Love', 'Career', 'Health', 'Spirit', 'Finance', 'Change']);

/**
 * POST /api/reading — AI reading with 3-part distillation.
 */
export async function handleReading(request: Request, env: Env, deps: ReadingDeps): Promise<Response> {
    const startTime = Date.now();

    try {
        const body = await request.json() as ReadingRequest;
        const { userContext, gameContext } = body;
        const sanitizedQuestion = sanitizeUserText(gameContext.question);
        const sanitizedTopic = sanitizeUserText(gameContext.topic, 120);
        const sanitizedName = sanitizeUserText(userContext.name, 120);
        const sanitizedGender = sanitizeUserText(userContext.gender, 60);
        const sanitizedBirthdate = sanitizeUserText(userContext.birthdate, 60);
        const sanitizedLocation = sanitizeUserText(userContext.location, 120);
        let updatedTraitsDoc = await deps.userTraits.ensureForUser(userContext.uid);
        const sanitizedTraits = sanitizeTraitMap(updatedTraitsDoc.traits);

        // Build user summary for prompt
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
            formatPromptField('SELECTED TOPIC', sanitizedTopic),
            formatPromptField('SEEKER QUESTION', sanitizedQuestion),
            userContext.tone,
            userContext.language,
        );

        const aiResult = await callAI(env, prompt, gameContext.turnCount);
        const parsed = parseReadingResponse(aiResult.text, aiResult.provider, aiResult.model);
        const normalizedDelta = {
            ...parsed.userContextDelta,
            traits: {},
        };

        const customTopic = sanitizedTopic && !PREDEFINED_TOPICS.has(sanitizedTopic)
            ? sanitizedTopic
            : null;
        if (customTopic || sanitizedQuestion) {
            const extractionSource = [customTopic, sanitizedQuestion].filter(Boolean).join(' | ');
            const extractedTraits = await extractTraitsFromUserInput(env, {
                language: userContext.language,
                existingTraits: updatedTraitsDoc.traits,
                inputLabel: 'SEEKER CUSTOM INPUT',
                inputText: extractionSource,
            });
            if (Object.keys(extractedTraits).length > 0) {
                updatedTraitsDoc = await deps.userTraits.mergeForUser(userContext.uid, extractedTraits);
            }
        }

        const responseTime = Date.now() - startTime;

        // Extract geo from Cloudflare headers (available on every request)
        const cfData = (request as unknown as { cf?: Record<string, unknown> }).cf;
        const geo = {
            country: request.headers.get('cf-ipcountry') ?? null,
            city: (cfData?.city as string) ?? null,
            timezone: (cfData?.timezone as string) ?? null,
        };

        // ── R2 persistence (best-effort, non-blocking) ──
        // Wrapped in try/catch so readings succeed even when R2 is unavailable (e.g. local dev)
        try {
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
                question: sanitizedQuestion,
                topic: sanitizedTopic,
                language: userContext.language,
                tone: userContext.tone,
                location: geo,
                originalRequest: {
                    ...body,
                    userContext: {
                        ...body.userContext,
                        userTraits: deps.userTraits.toPayload(updatedTraitsDoc),
                    },
                    gameContext: {
                        ...body.gameContext,
                        question: sanitizedQuestion,
                        topic: sanitizedTopic,
                    },
                },
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
                question: sanitizedQuestion,
                questionDigest: null,
                answerText: aiResult.text,
                answerDigest: parsed.contextUpdate,
                userContextDelta: normalizedDelta as unknown as Record<string, unknown>,
                aiProvider: aiResult.provider,
                aiModel: aiResult.model,
                responseTimeMs: responseTime,
                tokenBudgetUsed: 0,
            });

            // Update user stats + indexes (best-effort)
            deps.users.upsert(userContext.uid, {
                country: geo.country,
                city: geo.city,
                language: userContext.language,
                tone: userContext.tone,
                name: sanitizedName,
                gender: sanitizedGender,
                birthdate: sanitizedBirthdate,
                location: sanitizedLocation,
                userTraitsId: updatedTraitsDoc.id,
            }).catch(() => {});
            deps.users.applyContextDelta(userContext.uid, normalizedDelta).catch(() => {});
            deps.users.incrementStat(userContext.uid, 'totalReadings').catch(() => {});
            deps.indexWriter.addUserGame(userContext.uid, gameContext.gameId).catch(() => {});
            deps.indexWriter.addDateGame(date, gameContext.gameId).catch(() => {});
            deps.indexWriter.trackActiveUser(date, userContext.uid).catch(() => {});
            deps.analytics.incrementDaily(date, {
                readings: 1,
                language: userContext.language,
            }).catch(() => {});
        } catch (persistErr) {
            console.warn('R2 persistence failed (reading still returned):', persistErr instanceof Error ? persistErr.message : String(persistErr));
        }

        console.log(`Reading completed in ${responseTime}ms via ${aiResult.provider}/${aiResult.model}`);

        return Response.json({
            ...parsed,
            userContextDelta: normalizedDelta,
            userTraits: deps.userTraits.toPayload(updatedTraitsDoc),
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Reading handler error:', message);
        return Response.json(
            { error: 'Reading failed', message },
            { status: 500 },
        );
    }
}
