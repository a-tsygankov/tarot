import type { Env } from '../env.js';
import type { EventRequest } from '@shared/contracts/api-contracts.js';

/**
 * POST /api/event — log user events to R2 (fire-and-forget style).
 */
export async function handleEvent(request: Request, env: Env): Promise<Response> {
    try {
        const body = await request.json() as EventRequest;
        const now = new Date().toISOString();
        const date = now.slice(0, 10);
        const eventId = crypto.randomUUID();

        // Write event as immutable object (append-only)
        const eventDoc = {
            eventId,
            uid: body.uid,
            sessionId: body.sessionId,
            createdAt: now,
            eventType: body.eventType,
            eventData: body.eventData ?? null,
            country: request.headers.get('cf-ipcountry') ?? null,
        };

        await env.R2.put(
            `entities/events/${date}/${eventId}.json`,
            JSON.stringify(eventDoc),
        );

        return Response.json({ ok: true });
    } catch (err) {
        console.error('Event handler error:', err);
        // Events are fire-and-forget — still return 200
        return Response.json({ ok: false });
    }
}
