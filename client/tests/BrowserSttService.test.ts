import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserSttService } from '../src/services/Stt/BrowserSttService.js';

class MockRecognition {
    continuous = false;
    interimResults = false;
    lang = 'en-US';
    onresult?: (event: any) => void;
    onstart?: () => void;
    onend?: () => void;
    onerror?: (event: { error: string }) => void;
    start = vi.fn(() => {
        this.onstart?.();
    });
    stop = vi.fn(() => {
        this.onend?.();
    });
    abort = vi.fn(() => {
        this.onend?.();
    });
}

describe('BrowserSttService', () => {
    let recognition: MockRecognition;

    beforeEach(() => {
        recognition = new MockRecognition();
        vi.clearAllMocks();
        (window as any).webkitSpeechRecognition = vi.fn(() => recognition);
        delete (window as any).SpeechRecognition;
    });

    it('stops recognition immediately after a final result', () => {
        const service = new BrowserSttService();
        const onResult = vi.fn();
        const onEnd = vi.fn();

        service.start('en-US', { onResult, onEnd });

        recognition.onresult?.({
            results: [
                Object.assign([{ transcript: 'hello oracle' }], { isFinal: true }),
            ],
        });

        expect(onResult).toHaveBeenCalledWith('hello oracle');
        expect(recognition.stop).toHaveBeenCalledTimes(1);
        expect(onEnd).toHaveBeenCalledTimes(1);
    });

    it('uses abort on explicit stop to release the microphone promptly', () => {
        const service = new BrowserSttService();

        service.start('en-US', {});
        service.stop();

        expect(recognition.abort).toHaveBeenCalledTimes(1);
    });
});
