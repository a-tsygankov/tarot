import type { UserTraitsPayload } from '../contracts/api-contracts.js';

/**
 * UserContext interface — client-owned user settings and profile fields.
 * Trait extraction is server-owned and attached as a snapshot.
 */
export interface IUserContext {
    uid: string;
    sessionId: string;
    name: string | null;
    gender: string | null;
    birthdate: string | null;
    location: string | null;
    userTraits: UserTraitsPayload | null;
    language: string;
    tone: string;
    theme: string;
    voicePreference: 'female' | 'male' | 'off';
    ttsProvider: 'browser' | 'piper';
    totalReadings: number;
    deviceInfo: DeviceInfo;
}

export interface DeviceInfo {
    userAgent: string;
    platform: string;
    deviceType: 'phone' | 'tablet' | 'desktop' | 'unknown';
    osName: string | null;
    osVersion: string | null;
    browserName: string | null;
    browserVersion: string | null;
    model: string | null;
    summary: string;
    screenWidth: number;
    screenHeight: number;
    timezone?: string;
}
