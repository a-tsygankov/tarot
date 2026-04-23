import { describe, it, expect } from 'vitest';
import { buildReadingPrompt, buildFollowUpPrompt, PROMPTS } from '../src/prompts.js';

describe('buildReadingPrompt', () => {
    it('includes system reading instruction', () => {
        const prompt = buildReadingPrompt('No details.', '3-card spread.', null, 'Mystical', 'ENG');
        expect(prompt).toContain(PROMPTS.systemReading);
    });

    it('includes user summary', () => {
        const prompt = buildReadingPrompt('Name: Anna | zodiac: Leo', '3-card.', null, 'Mystical', 'ENG');
        expect(prompt).toContain('Name: Anna | zodiac: Leo');
    });

    it('includes game context', () => {
        const ctx = '3-card spread.\nCARDS: Past: The Fool, Present: The Star, Future: The Moon';
        const prompt = buildReadingPrompt('No details.', ctx, null, 'Mystical', 'ENG');
        expect(prompt).toContain('The Fool');
        expect(prompt).toContain('The Star');
    });

    it('includes question when provided', () => {
        const prompt = buildReadingPrompt('No details.', '1-card.', 'Will I find love?', 'Mystical', 'ENG');
        expect(prompt).toContain('Will I find love?');
        expect(prompt).toContain("SEEKER'S QUESTION");
    });

    it('omits question section when null', () => {
        const prompt = buildReadingPrompt('No details.', '1-card.', null, 'Mystical', 'ENG');
        expect(prompt).not.toContain("SEEKER'S QUESTION");
    });

    it('includes tone for non-Mystical', () => {
        const prompt = buildReadingPrompt('No details.', '1-card.', null, 'Ironic', 'ENG');
        expect(prompt).toContain('witty, ironic');
    });

    it('uses Mystical tone by default (no extra tone text)', () => {
        const prompt = buildReadingPrompt('No details.', '1-card.', null, 'Mystical', 'ENG');
        expect(prompt).not.toContain('TONE:');
    });

    it('includes language instruction', () => {
        const prompt = buildReadingPrompt('No details.', '1-card.', null, 'Mystical', 'RUS');
        expect(prompt).toContain('Russian');
    });

    it('falls back to English for unknown language', () => {
        const prompt = buildReadingPrompt('No details.', '1-card.', null, 'Mystical', 'UNKNOWN');
        expect(prompt).toContain('English');
    });

    it('includes distillation instruction with JSON schema', () => {
        const prompt = buildReadingPrompt('No details.', '1-card.', null, 'Mystical', 'ENG');
        expect(prompt).toContain('"reading"');
        expect(prompt).toContain('"contextUpdate"');
        expect(prompt).toContain('"userContextDelta"');
    });

    it('includes length constraints', () => {
        const prompt = buildReadingPrompt('No details.', '1-card.', null, 'Mystical', 'ENG');
        expect(prompt).toContain('3-5 sentences');
        expect(prompt).toContain('5-8 sentences');
    });

    it('includes trait extraction examples', () => {
        const prompt = buildReadingPrompt('No details.', '1-card.', null, 'Mystical', 'ENG');
        expect(prompt).toContain('zodiac_sign');
        expect(prompt).toContain('occupation');
        expect(prompt).toContain('education');
    });
});

describe('buildFollowUpPrompt', () => {
    it('includes follow-up system instruction', () => {
        const prompt = buildFollowUpPrompt('No details.', '3-card.', 'Tell me more?', 'Mystical', 'ENG');
        expect(prompt).toContain(PROMPTS.systemFollowUp);
    });

    it('includes the question', () => {
        const prompt = buildFollowUpPrompt('No details.', '3-card.', 'What about love?', 'Mystical', 'ENG');
        expect(prompt).toContain('What about love?');
        expect(prompt).toContain("SEEKER'S FOLLOW-UP QUESTION");
    });

    it('includes follow-up distillation schema', () => {
        const prompt = buildFollowUpPrompt('No details.', '3-card.', 'Q?', 'Mystical', 'ENG');
        expect(prompt).toContain('"questionDigest"');
        expect(prompt).toContain('"answerDigest"');
    });

    it('includes follow-up length constraint', () => {
        const prompt = buildFollowUpPrompt('No details.', '3-card.', 'Q?', 'Mystical', 'ENG');
        expect(prompt).toContain('5-8 sentences');
    });

    it('applies tone', () => {
        const prompt = buildFollowUpPrompt('No details.', '3-card.', null, null, 'Q?', 'Normal', 'ENG');
        expect(prompt).toContain('grounded, everyday');
    });

    it('applies language', () => {
        const prompt = buildFollowUpPrompt('No details.', '3-card.', 'Q?', 'Mystical', 'DEU');
        expect(prompt).toContain('German');
    });
});

describe('PROMPTS constants', () => {
    it('has all required tone keys', () => {
        expect(PROMPTS.tones).toHaveProperty('Mystical');
        expect(PROMPTS.tones).toHaveProperty('Ironic');
        expect(PROMPTS.tones).toHaveProperty('Normal');
    });

    it('has all required language keys', () => {
        expect(PROMPTS.languages).toHaveProperty('ENG');
        expect(PROMPTS.languages).toHaveProperty('RUS');
        expect(PROMPTS.languages).toHaveProperty('UKR');
        expect(PROMPTS.languages).toHaveProperty('DEU');
        expect(PROMPTS.languages).toHaveProperty('AZE');
    });

    it('Mystical tone is empty (default oracle voice)', () => {
        expect(PROMPTS.tones.Mystical).toBe('');
    });
});
