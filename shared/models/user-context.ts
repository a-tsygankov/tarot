/**
 * UserContext interface — accumulated user profile.
 * Built from AI-extracted data across sessions.
 */
export interface IUserContext {
    uid: string;
    sessionId: string;
    name: string | null;
    gender: string | null;
    birthdate: string | null;
    location: string | null;
    traits: Record<string, string>;
    language: string;
    tone: string;
    theme: string;
    noReversedCards: boolean;
    muted: boolean;
    voicePreference: 'female' | 'male' | 'off';
    ttsProvider: 'browser' | 'piper';
    totalReadings: number;
    deviceInfo: DeviceInfo;
}

export interface DeviceInfo {
    userAgent: string;
    platform: string;
    screenWidth: number;
    screenHeight: number;
    timezone?: string;
}
