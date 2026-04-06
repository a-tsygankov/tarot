export interface TtsDiagnosticsEntry {
    provider: 'browser' | 'elevenlabs';
    phase: 'start' | 'voices' | 'speak' | 'playback' | 'success' | 'error';
    timestamp: string;
    details: Record<string, unknown>;
}

let lastDiagnostics: TtsDiagnosticsEntry[] = [];

export function recordTtsDiagnostics(entry: TtsDiagnosticsEntry): void {
    lastDiagnostics = [...lastDiagnostics, entry].slice(-50);
    window.dispatchEvent(new CustomEvent('tarot:tts-diagnostics', { detail: entry }));
    console.info('[TTS]', entry.provider, entry.phase, entry.details);
}

export function getTtsDiagnostics(): TtsDiagnosticsEntry[] {
    return [...lastDiagnostics];
}

export function clearTtsDiagnostics(): void {
    lastDiagnostics = [];
    window.dispatchEvent(new CustomEvent('tarot:tts-diagnostics-cleared'));
}
