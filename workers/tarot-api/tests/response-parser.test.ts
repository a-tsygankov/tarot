import { describe, it, expect } from 'vitest';
import { parseReadingResponse, parseFollowUpResponse } from '../src/services/response-parser.js';

describe('parseReadingResponse', () => {
    const validReading = {
        reading: {
            cards: [{ position: 'Past', name: 'The Fool', reading: 'New beginnings.' }],
            overall: 'A journey begins.',
        },
        contextUpdate: 'Themes of new beginnings.',
        userContextDelta: { name: null, gender: null, birthdate: null, location: null, traits: {} },
    };

    it('parses clean JSON', () => {
        const raw = JSON.stringify(validReading);
        const result = parseReadingResponse(raw, 'gemini', 'gemini-2.5-flash');

        expect(result.reading.cards).toHaveLength(1);
        expect(result.reading.cards[0].name).toBe('The Fool');
        expect(result.reading.overall).toBe('A journey begins.');
        expect(result.contextUpdate).toBe('Themes of new beginnings.');
        expect(result.provider).toBe('gemini');
        expect(result.model).toBe('gemini-2.5-flash');
    });

    it('parses JSON inside markdown fences', () => {
        const raw = '```json\n' + JSON.stringify(validReading) + '\n```';
        const result = parseReadingResponse(raw, 'anthropic', 'claude-sonnet-4-6');

        expect(result.reading.cards[0].name).toBe('The Fool');
        expect(result.provider).toBe('anthropic');
    });

    it('parses JSON inside plain fences', () => {
        const raw = '```\n' + JSON.stringify(validReading) + '\n```';
        const result = parseReadingResponse(raw, 'gemini', 'gemini-2.5-pro');

        expect(result.reading.overall).toBe('A journey begins.');
    });

    it('extracts JSON with trailing text (Gemini behavior)', () => {
        const raw = JSON.stringify(validReading) + '\n\nHere is your reading based on the cards drawn.';
        const result = parseReadingResponse(raw, 'gemini', 'gemini-2.5-flash');

        expect(result.reading.cards[0].name).toBe('The Fool');
    });

    it('extracts JSON with leading text', () => {
        const raw = 'Here is the reading:\n' + JSON.stringify(validReading);
        const result = parseReadingResponse(raw, 'gemini', 'gemini-2.5-flash');

        expect(result.reading.cards[0].name).toBe('The Fool');
    });

    it('extracts JSON with both leading and trailing text', () => {
        const raw = 'Sure! Here is the reading:\n\n' + JSON.stringify(validReading) + '\n\nI hope this helps!';
        const result = parseReadingResponse(raw, 'gemini', 'gemini-2.5-flash');

        expect(result.reading.overall).toBe('A journey begins.');
    });

    it('defaults userContextDelta when missing', () => {
        const minimal = { reading: validReading.reading, contextUpdate: 'Summary.' };
        const raw = JSON.stringify(minimal);
        const result = parseReadingResponse(raw, 'gemini', 'gemini-2.5-flash');

        expect(result.userContextDelta).toEqual({
            name: null, gender: null, birthdate: null, location: null, traits: {},
        });
    });

    it('preserves userContextDelta with traits', () => {
        const withTraits = {
            ...validReading,
            userContextDelta: {
                name: 'Anna',
                gender: null,
                birthdate: null,
                location: null,
                traits: { zodiac_sign: 'Aquarius', occupation: 'engineer' },
            },
        };
        const raw = JSON.stringify(withTraits);
        const result = parseReadingResponse(raw, 'gemini', 'gemini-2.5-flash');

        expect(result.userContextDelta.name).toBe('Anna');
        expect(result.userContextDelta.traits.zodiac_sign).toBe('Aquarius');
        expect(result.userContextDelta.traits.occupation).toBe('engineer');
    });

    it('throws on missing reading field', () => {
        const invalid = { contextUpdate: 'Summary.' };
        expect(() => parseReadingResponse(JSON.stringify(invalid), 'g', 'm'))
            .toThrow('missing required fields');
    });

    it('throws on missing contextUpdate field', () => {
        const invalid = { reading: validReading.reading };
        expect(() => parseReadingResponse(JSON.stringify(invalid), 'g', 'm'))
            .toThrow('missing required fields');
    });

    it('throws on non-JSON input', () => {
        expect(() => parseReadingResponse('This is not JSON at all', 'g', 'm'))
            .toThrow('Could not extract JSON');
    });

    it('throws on empty input', () => {
        expect(() => parseReadingResponse('', 'g', 'm'))
            .toThrow('Could not extract JSON');
    });
});

describe('parseFollowUpResponse', () => {
    const validFollowUp = {
        answer: 'The cards suggest patience.',
        questionDigest: 'Asked about timing.',
        answerDigest: 'Advised patience.',
        userContextDelta: null,
    };

    it('parses clean JSON', () => {
        const result = parseFollowUpResponse(JSON.stringify(validFollowUp));

        expect(result.answer).toBe('The cards suggest patience.');
        expect(result.questionDigest).toBe('Asked about timing.');
        expect(result.answerDigest).toBe('Advised patience.');
        expect(result.userContextDelta).toBeNull();
    });

    it('parses fenced JSON', () => {
        const raw = '```json\n' + JSON.stringify(validFollowUp) + '\n```';
        const result = parseFollowUpResponse(raw);

        expect(result.answer).toBe('The cards suggest patience.');
    });

    it('extracts JSON with surrounding text', () => {
        const raw = 'Here you go:\n' + JSON.stringify(validFollowUp) + '\nLet me know if you need more.';
        const result = parseFollowUpResponse(raw);

        expect(result.answerDigest).toBe('Advised patience.');
    });

    it('preserves userContextDelta with traits', () => {
        const withDelta = {
            ...validFollowUp,
            userContextDelta: {
                name: null, gender: null, birthdate: null, location: 'Berlin',
                traits: { relationship_status: 'single' },
            },
        };
        const result = parseFollowUpResponse(JSON.stringify(withDelta));

        expect(result.userContextDelta).not.toBeNull();
        expect(result.userContextDelta!.location).toBe('Berlin');
    });

    it('throws on missing answer', () => {
        const invalid = { questionDigest: 'Q', answerDigest: 'A' };
        expect(() => parseFollowUpResponse(JSON.stringify(invalid)))
            .toThrow('missing required fields');
    });

    it('throws on missing questionDigest', () => {
        const invalid = { answer: 'A', answerDigest: 'D' };
        expect(() => parseFollowUpResponse(JSON.stringify(invalid)))
            .toThrow('missing required fields');
    });
});
