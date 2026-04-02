import type { IUserContext, DeviceInfo } from '@shared/models/user-context.js';
import type { UserContextDelta } from '@shared/contracts/api-contracts.js';

const STORAGE_KEYS = {
    uid: 'tarot_uid',
    lang: 'tarot_lang',
    tone: 'tarot_tone',
    theme: 'tarot_theme',
    voiceId: 'tarot_voice_id',
    ttsSpeed: 'tarot_tts_speed',
    font: 'tarot_font',
    userName: 'tarot_user_name',
    userGender: 'tarot_user_gender',
    userBirthdate: 'tarot_user_birthdate',
    userTraits: 'tarot_user_traits',
    totalReadings: 'tarot_total_readings',
    version: 'tarot_version',
} as const;

/**
 * Accumulated user profile built from AI-extracted data across sessions.
 * Persisted to localStorage on client.
 */
export class UserContext implements IUserContext {
    uid: string;
    sessionId: string;
    name: string | null = null;
    gender: string | null = null;
    birthdate: string | null = null;
    location: string | null = null;
    traits: Record<string, string> = {};
    language = 'ENG';
    tone = 'Mystical';
    theme = 'dusk';
    voiceId: string | null = null;
    totalReadings = 0;
    deviceInfo: DeviceInfo;

    constructor() {
        this.uid = this.getOrCreateUid();
        this.sessionId = crypto.randomUUID();
        this.deviceInfo = this.buildDeviceInfo();
    }

    /** Restore saved fields from localStorage. */
    restore(): void {
        this.name = localStorage.getItem(STORAGE_KEYS.userName);
        this.gender = localStorage.getItem(STORAGE_KEYS.userGender);
        this.birthdate = localStorage.getItem(STORAGE_KEYS.userBirthdate);
        this.language = localStorage.getItem(STORAGE_KEYS.lang) ?? 'ENG';
        this.tone = localStorage.getItem(STORAGE_KEYS.tone) ?? 'Mystical';
        this.theme = localStorage.getItem(STORAGE_KEYS.theme) ?? 'dusk';
        this.voiceId = localStorage.getItem(STORAGE_KEYS.voiceId);
        this.totalReadings = parseInt(localStorage.getItem(STORAGE_KEYS.totalReadings) ?? '0', 10);
        this.location = this.getApproxLocation();

        const traitsJson = localStorage.getItem(STORAGE_KEYS.userTraits);
        if (traitsJson) {
            try {
                this.traits = JSON.parse(traitsJson);
            } catch {
                this.traits = {};
            }
        }
    }

    /** Persist saveable fields to localStorage. */
    save(): void {
        localStorage.setItem(STORAGE_KEYS.uid, this.uid);
        this.setIfNotNull(STORAGE_KEYS.userName, this.name);
        this.setIfNotNull(STORAGE_KEYS.userGender, this.gender);
        this.setIfNotNull(STORAGE_KEYS.userBirthdate, this.birthdate);
        localStorage.setItem(STORAGE_KEYS.lang, this.language);
        localStorage.setItem(STORAGE_KEYS.tone, this.tone);
        localStorage.setItem(STORAGE_KEYS.theme, this.theme);
        this.setIfNotNull(STORAGE_KEYS.voiceId, this.voiceId);
        localStorage.setItem(STORAGE_KEYS.totalReadings, String(this.totalReadings));
        localStorage.setItem(STORAGE_KEYS.userTraits, JSON.stringify(this.traits));
    }

    /**
     * Merge AI-returned user context delta.
     * Known fields go to top-level. Everything else merges into traits.
     * Null values are ignored (never delete existing data).
     */
    applyAiUpdate(delta: UserContextDelta | null): void {
        if (!delta) return;

        if (delta.name != null) this.name = delta.name;
        if (delta.gender != null) this.gender = delta.gender;
        if (delta.birthdate != null) this.birthdate = delta.birthdate;
        if (delta.location != null) this.location = delta.location;

        if (delta.traits && typeof delta.traits === 'object') {
            for (const [key, value] of Object.entries(delta.traits)) {
                if (value != null) {
                    this.traits[key] = value;
                }
            }
        }

        this.save();
    }

    /** Serialize for API requests. */
    toApiPayload() {
        return {
            uid: this.uid,
            sessionId: this.sessionId,
            name: this.name,
            gender: this.gender,
            birthdate: this.birthdate,
            location: this.location,
            traits: this.traits,
            language: this.language,
            tone: this.tone,
        };
    }

    /** Build human-readable summary for prompt context. */
    toPromptSummary(): string {
        const parts: string[] = [];
        if (this.name) parts.push('Name: ' + this.name);
        if (this.gender) parts.push('Gender: ' + this.gender);
        if (this.birthdate) parts.push('Born: ' + this.birthdate);
        if (this.location) parts.push('Location: ' + this.location);

        for (const [key, value] of Object.entries(this.traits)) {
            parts.push(key.replace(/_/g, ' ') + ': ' + value);
        }

        return parts.length > 0 ? parts.join(' | ') : 'No personal details known.';
    }

    // ── Private helpers ──────────────────────────────────────────────

    private getOrCreateUid(): string {
        const existing = localStorage.getItem(STORAGE_KEYS.uid);
        if (existing) return existing;

        const uid = crypto.randomUUID();
        localStorage.setItem(STORAGE_KEYS.uid, uid);
        return uid;
    }

    private getApproxLocation(): string | null {
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            return tz ?? null;
        } catch {
            return null;
        }
    }

    private buildDeviceInfo(): DeviceInfo {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            screenWidth: screen.width,
            screenHeight: screen.height,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
    }

    private setIfNotNull(key: string, value: string | null): void {
        if (value != null) {
            localStorage.setItem(key, value);
        }
    }
}
